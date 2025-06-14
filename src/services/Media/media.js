const axios = require('axios');
const httpAdapter = require("axios/lib/adapters/http");
const fs = require('fs-extra')
const tokenService = require('../Token/token')
const s3Service = require("../S3/S3Service");

const audioFiles = {
  landing: 'https://pages.s3.us-east-2.amazonaws.com/BisneyHelix-Prerequisite.mp3',
  bisney: 'https://ftcalbum.s3.us-west-1.amazonaws.com/FREE+THE+CARTOON+%3A+AFTA+YESTA.mp3',
  airnidas: 'https://ftcalbum.s3.us-west-1.amazonaws.com/FREE+THE+CARTOON+%3A+AIR+NIDAS.mp3',
  culvar: 'https://ftcalbum.s3.us-west-1.amazonaws.com/FREE+THE+CARTOON+%3A+CULVAR.mp3',
  goniaface: 'https://ftcalbum.s3.us-west-1.amazonaws.com/FREE+THE+CARTOON+%3A+GONIAFACE.mp3',
  goodmunchie: 'https://ftcalbum.s3.us-west-1.amazonaws.com/FREE+THE+CARTOON+%3A+GOOD+MUNCHIE.mp3',
  supfooku: 'https://ftcalbum.s3.us-west-1.amazonaws.com/FREE+THE+CARTOON+%3A+SUPFOOKU.mp3',
};

const isValidHeaderReferer = (req) =>
  req.headers?.referer?.indexOf('imaginecouncil') >= 0 ||
  req.headers?.referer?.indexOf('portalpathway') >= 0 ||
  req.headers?.referer?.indexOf('icso-') >= 0 ||
  req.headers?.referer?.indexOf('localhost') >= 0;

const getAudioFile = async (req, res) => {
  if (req.headers['sec-fetch-dest'] === 'audio' || isValidHeaderReferer) {

    if (!req.params.name) {
      return res.status(404).send({ message: 'Media not found' });
    }

    const url = req.params.name.indexOf('landing') >= 0 ? audioFiles.landing :
      await s3Service.getPresignedUrl({ Bucket: 'color-message-one', Key: `${req.params.name}.mp3` });

    axios.get(url, {
      responseType: "stream",
      adapter: httpAdapter,
      "Content-Range": "bytes 16561-8065611",
    })
      .then((Response) => {
        const stream = Response.data;

        res.set("content-type", "audio/mp3");
        res.set("accept-ranges", "bytes");
        res.set("content-length", Response.headers["content-length"]);

        stream.on("data", (chunk) => {
          res.write(chunk);
        });

        stream.on("error", (err) => {
          res.sendStatus(404);
        });

        stream.on("end", () => {
          res.end();
        });
      })
      .catch((Err) => {
        console.log(Err.message);
        return res.status(404).send({ message: 'Media not found' })
      });
  } else {
    return res.status(404).send({ message: 'Media not found' })
  }
};

const getVideoFile = (req, res) => {
  if (req.headers['sec-fetch-dest'] === 'video' || isValidHeaderReferer) {
    const color = req.query.color || 'original';
    return tokenService
      .getVideoForToken(req?.tokenId, color)
      .then(({ videoPath, videoName }) => {
        const options = {}
        const range = req.headers.range

        let start
        let end

        if (range) {
          const bytesPrefix = 'bytes='
          if (range.startsWith(bytesPrefix)) {
            const bytesRange = range.substring(bytesPrefix.length)
            const parts = bytesRange.split('-')
            if (parts.length === 2) {
              const rangeStart = parts[0] && parts[0].trim()
              if (rangeStart && rangeStart.length > 0) {
                options.start = start = parseInt(rangeStart)
              }
              const rangeEnd = parts[1] && parts[1].trim()
              if (rangeEnd && rangeEnd.length > 0) {
                options.end = end = parseInt(rangeEnd)
              }
            }
          }
        }

        res.setHeader('content-type', 'video/mp4')

        fs.stat(videoName, (err, stat) => {
          if (err) {
            console.error(`File stat error for ${videoName}.`)
            console.error(err)
            res.sendStatus(500)
            return
          }

          let contentLength = stat.size

          if (req.method === 'HEAD') {
            res.statusCode = 200
            res.setHeader('accept-ranges', 'bytes')
            res.setHeader('content-length', contentLength)
            res.end()
          } else {
            let retrievedLength
            if (start !== undefined && end !== undefined) {
              retrievedLength = end + 1 - start
            } else if (start !== undefined) {
              retrievedLength = contentLength - start
            } else if (end !== undefined) {
              retrievedLength = end + 1
            } else {
              retrievedLength = contentLength
            }

            res.statusCode = start !== undefined || end !== undefined ? 206 : 200

            res.setHeader('content-length', retrievedLength)

            if (range !== undefined) {
              res.setHeader(
                'content-range',
                `bytes ${start || 0}-${end || contentLength - 1
                }/${contentLength}`
              )
              res.setHeader('accept-ranges', 'bytes')
            }

            const fileStream = fs.createReadStream(videoName, options)
            fileStream.on('error', (error) => {
              console.log(`Error reading file ${videoName}.`)
              console.log(error)
              res.sendStatus(500)
            })

            fileStream.pipe(res)
          }
        })
      })
      .catch((error) => res.status(500).send({ message: error.message }))
  } else {
    return res.status(404).send({ message: 'Video not found' })
  }
}

const getImageFile = async (req, res) => {
  if (isValidHeaderReferer) {

    axios.get(`https://uppyupload.s3.amazonaws.com/${req.params.name}.png`, {
      responseType: "stream",
      adapter: httpAdapter,
      "Content-Range": "bytes 16561-8065611",
    })
      .then((Response) => {
        const stream = Response.data;

        res.set("content-type", "image/png");
        res.set("content-length", Response.headers["content-length"]);

        stream.on("data", (chunk) => {
          res.write(chunk);
        });

        stream.on("error", (err) => {
          res.sendStatus(404);
        });

        stream.on("end", () => {
          res.end();
        });
      })
      .catch((Err) => {
        console.log(Err.message);
        res.status(500).send({ message: Err.message });
      });
  } else {
    return res.status(404).send({ message: 'Image not found' })
  }
};

const getType = (type) => {
  switch (type) {
    case 'video':
      return 'video/mp4';
    case 'image':
      return 'image/png';
    case 'audio':
      return 'audio/mpeg';
    default:
      return 'video/mp4';
  }
}

const getFileUrl = async (req, res) => {
  if (isValidHeaderReferer) {

    const key = req.params.key;
    const type = req.params.type;
    const url = await s3Service.getPresignedUrl({ Bucket: 'ic-filestack', Key: key });

    axios.get(url, {
      responseType: "stream",
      adapter: httpAdapter,
      "Content-Range": "bytes 16561-8065611",
    })
      .then((Response) => {
        const stream = Response.data;

        res.set("content-type", getType(type));
        res.set("content-length", Response.headers["content-length"]);

        stream.on("data", (chunk) => {
          res.write(chunk);
        });

        stream.on("error", (err) => {
          res.sendStatus(404);
        });

        stream.on("end", () => {
          res.end();
        });
      })
      .catch((error) => {
        res.status(500).send({ message: error.message });
      });
  } else {
    return res.status(404).send({ message: 'Video not found' })
  }
};

module.exports = {
  getAudioFile,
  getVideoFile,
  getImageFile,
  getFileUrl,
};
