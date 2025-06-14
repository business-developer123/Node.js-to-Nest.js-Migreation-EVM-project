const AWS = require("aws-sdk");
const { uuid } = require("uuidv4");
const filePath = "./downloaded.json";
require("dotenv").config();

AWS.config.update({
  accessKeyId: process.env.AWS_ACCESS_KEY,
  secretAccessKey: process.env.AWS_SECRET_KEY,
});
let s3 = new AWS.S3();
const defaultNodeImage = { Key: "default.png" };
const AwsRecordSchema = require("../../models/aswRecord");
const {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
} = require("@aws-sdk/client-s3");
const { getSignedUrl } = require("@aws-sdk/s3-request-presigner");
const REGION = process.env.AWS_REGION;
const BUCKET = process.env.AWS_BUCKET_NAME;
const USED_BUCKET = process.env.AWS_USED_BUCKET;
const VOTING_NODE_IMAGES = process.env.AWS_VOTIING_NODE_IMAGES;
const UPPY_S3 = process.env.AWS_UPPY_S3;
const ACCESS_KEY = process.env.AWS_ACCESS_KEY;
const SECRET_KEY = process.env.AWS_SECRET_KEY;
const aws_s3 = new S3Client({
  region: REGION,
  credentials: {
    accessKeyId: ACCESS_KEY,
    secretAccessKey: SECRET_KEY,
  },
});
async function getRandomNodeImageFromBucket() {
  var params = {
    Bucket: BUCKET,
  };
  const nodeImages = await s3.listObjects(params).promise();
  let randomElement = defaultNodeImage;
  let array = nodeImages.Contents;
  let defaultIndex = array.findIndex((a) => a.Key === defaultNodeImage.Key);
  array.splice(defaultIndex, 1);
  if (array.length > 1) {
    randomElement = getRandomItem(array);
  }
  return randomElement.Key;
}
async function getRandomNodeImageFromBucketToVoteState() {
  const nodeImages = await s3
    .listObjects({
      Bucket: VOTING_NODE_IMAGES,
    })
    .promise();
  let randomElement;
  let array = nodeImages.Contents;
  if (array.length > 1) {
    randomElement = getRandomItem(array);
  }
  return randomElement.Key;
}
getRandomItem = (array) => array[Math.floor(Math.random() * array.length)];
async function getImagesFromBucketVotingNodeImages() {
  const nodeImages = await s3
    .listObjects({
      Bucket: VOTING_NODE_IMAGES
    })
    .promise();
  return nodeImages.Contents;
}
function getRandomItemFromImageArray(array) {
  let randomElement;
  if (array.length > 1) {
    randomElement = getRandomItem(array);
  }
  return randomElement.Key;
}
async function nodeImageFromS3AndMoveToUsedBucket(fileName) {
  let chunks = [];
  const params = {
    Bucket: BUCKET,
    Key: fileName,
  };
  s3.getObject(params)
    .on("httpData", (chunk) => chunks.push(chunk))
    .on("httpDone", (response) => {
      if (response.error) {
        console.log(response.error);
      } else {
        let fileBuffer = Buffer.concat(chunks);
        const uploadParams = {
          Bucket: USED_BUCKET,
          Body: fileBuffer,
          Key: fileName,
          ACL: "public-read",
        };
        s3.putObject(uploadParams).promise();
        const deleteParams = {
          Bucket: BUCKET,
          Key: fileName,
        };
        s3.deleteObject(deleteParams).promise();
      }
    })
    .send();
}
async function uploadToS3(fileName) {
  // let readFile = fs.readFileSync(fileName)
  const params = {
    Bucket: USED_BUCKET,
    Body: filePath,
    Key: readFile,
    ACL: "public-read",
  };
  const s3Response = await s3.putObject(params).promise();
  return {
    url: s3Response.Location,
    key: s3Response.Key,
  };
}
async function uploadUppyContent(imageBuffer, bucketFolder, userId) {
  let dateNow = Date.now().toString();
  const params = {
    Bucket: UPPY_S3,
    Key: `${bucketFolder}/${dateNow}-${userId}.png`,
    Body: imageBuffer,
    ACL: "public-read",
  };
  try {
    await s3.putObject(params).promise();
    return {
      success: true,
      message: "Ok",
      status: 200,
      image: `https://${UPPY_S3}.s3.amazonaws.com/${bucketFolder}/${dateNow}-${userId}.png`,
    };
  } catch (err) {
    console.log("err in uploading game submission (uppy) to s3", err);
    return {
      success: false,
      message: "err in uploading game submission (uppy) to s3",
      status: 500,
    };
  }
}
async function deleteFromS3(fileName) {
  const params = {
    Bucket: BUCKET,
    Key: fileName,
  };
  await s3.deleteObject(params).promise();
}
async function uploadFromUppyToS3(file) {
  let dateNow = Date.now().toString();
  let key = `${file.keyName}/${dateNow}-${file.filename}`;
  const params = {
    Metadata: {
      fileName: file.metadata.name,
      caption: file.metadata.caption,
      user: file.user,
      uploadDateUTC: Date(),
    },
    Bucket: UPPY_S3,
    Key: key,
    ACL: "public-read",
    ContentType: file.contentType,
    Tagging: "random=random",
  };
  let url = await s3.getSignedUrlPromise("putObject", params);
  return {
    message: "Success",
    status: 200,
    url: url.toString(),
    img: `https://${UPPY_S3}.s3.amazonaws.com/${key}`,
  };
}
async function uploadGameImageToS3(fileName, gameId) {
  const imageBase64 = fileName.split(";base64,").pop();
  const imageBuffer = Buffer.from(imageBase64, "base64");
  const imageUuid = uuid();
  const params = {
    Bucket: UPPY_S3,
    Body: imageBuffer,
    Key: `${imageUuid}.png`,
    ACL: "public-read",
  };
  try {
    await s3.upload(params).promise();
    return {
      url: `https://uppyupload.s3.amazonaws.com/${imageUuid}.png`,
    };
  } catch (error) {
    console.log("error", error);
    return { url: "" };
  }
}
async function uploadProductImageToS3(fileName) {
  const imageBase64 = fileName.split(";base64,").pop();
  const imageBuffer = Buffer.from(imageBase64, "base64");
  const imageUuid = uuid();
  const params = {
    Bucket: UPPY_S3,
    Body: imageBuffer,
    Key: `${imageUuid}.png`,
    ACL: "public-read",
  };
  try {
    await s3.upload(params).promise();
    return {
      url: imageUuid,
    };
  } catch (error) {
    console.log("error", error);
    return { url: "" };
  }
}
async function getPresignedUrl(params) {
  try {
    const url = await s3.getSignedUrl("getObject", params);
    return url;
  } catch (e) {
    throw new Error(e.message);
  }
}
async function generateUploadUrl(req) {
  try {
    console.log("generateUploadUrl", req.body);
    const { userId, fileType } = req.body;
    if (!userId || !fileType) {
      return { status: 400, message: "Missing userId or fileType" };
    }
    const timestamp = Date.now();
    let objectKey = "";
    if (fileType.split("/")[0] === "video") {
      const ext = fileType.split("/")[1];
      objectKey = `uploads/videos/${userId}/${timestamp}.${ext}`;
    } else {
      const ext = fileType.split("/")[1];
      objectKey = `uploads/processed/${userId}/${timestamp}.${ext}`;
    }
    // 1. Create the signed PUT URL for upload
    const putCommand = new PutObjectCommand({
      Bucket: BUCKET,
      Key: objectKey,
      ContentType: fileType,
      ACL: "private",
    });
    const uploadUrl = await getSignedUrl(aws_s3, putCommand, {
      expiresIn: 300,
    });
    // 2. Create the signed GET URL for viewing/downloading the file
    const getCommand = new GetObjectCommand({
      Bucket: BUCKET,
      Key: objectKey,
    });
    let downloadUrl = await getSignedUrl(aws_s3, getCommand, {
      expiresIn: 600,
    }); // valid for 1 hour
    return {
      status: 200,
      message: "Success",
      data: {
        uploadUrl,
        objectKey,
        downloadUrl
      },
    };
  } catch (error) {
    return { status: 500, message: error.message };
  }
}
async function logUpload(req) {
  try {
    let { objectKey, userId, uploadType, referenceId, playbackUrl } = req.body;
    await AwsRecordSchema.create(
      new AwsRecordSchema({
        objectKey,
        userId,
        uploadType,
        referenceId,
        playbackUrl,
      })
    ).catch((error) => {
      console.log(error);
      errorMessage = `Failed to create brand. [error = ${error}]`;
    });
    return { status: 200, message: "Success" };
  } catch (error) {
    console.log("error", error.message);
    return { status: 500, message: error.message };
  }
}
module.exports = {
  getRandomNodeImageFromBucket,
  uploadProductImageToS3,
  uploadGameImageToS3,
  uploadUppyContent,
  uploadFromUppyToS3,
  nodeImageFromS3AndMoveToUsedBucket,
  uploadToS3,
  deleteFromS3,
  getPresignedUrl,
  getRandomNodeImageFromBucketToVoteState,
  getImagesFromBucketVotingNodeImages,
  getRandomItemFromImageArray,
  generateUploadUrl,
  logUpload,
};












