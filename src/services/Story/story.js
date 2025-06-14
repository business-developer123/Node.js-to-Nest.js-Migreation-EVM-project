const Story = require("../../models/story");
const s3Service = require("../S3/S3Service");

async function getStories(req, res) {
  try {
    const result = await Story.find({});
    return res.status(200).send({ message: "Success", data: result })
  } catch (error) {
    return res.status(500).send({ message: error.message });
  }
}

async function createStory(req, res) {
  const values = req.body.values;
  const { makers } = values;
  try {
    if (!values.icon) {
      throw new Error('Please upload an icon');
    }

    if (!values.desktopVideo || !values?.mobileVideo) {
      throw new Error('Please upload a two videos for story');
    }

    const story = new Story({
      name: values?.name,
      description: values?.description,
      status: values?.status,
      icon: { url: values.icon },
      banner: values?.banner,
      number: values?.number,
      storyType: values?.storyType,
      desktopVideo: values?.desktopVideo,
      mobileVideo: values?.mobileVideo,
      makers
    });
    await story.save();
    return res.status(200).send({ message: "Success", data: story })
  } catch (error) {
    return res.status(500).send({ message: error.message });
  }
}

async function updateStory(req, res) {
  const values = req.body.values;
  const { makers } = values;

  try {
    const story = await Story.findById(req.body.storyId);
    story.name = values?.name || story.name;
    story.description = values?.description || story.description;
    story.banner = values?.banner || story.banner;
    story.storyType = values?.storyType || story.storyType;
    story.status = values?.status || story.status;
    story.number = values?.number || story.number;
    story.desktopVideo = values?.desktopVideo || story.desktopVideo;
    story.mobileVideo = values?.mobileVideo || story.mobileVideo;
    story.makers = makers && Object.keys(makers).length ? makers : story.makers;
    story.icon = values?.icon || story.icon;

    await story.save();
    return res.status(200).send({ message: "Success", data: story })
  } catch (error) {
    return res.status(500).send({ message: error.message });
  }
}

module.exports = {
  getStories,
  createStory,
  updateStory,
};
