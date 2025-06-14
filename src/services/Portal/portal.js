const { uuid } = require('uuidv4');
var bcrypt = require('bcrypt-nodejs')
const Portal = require("../../models/portal");
const User = require("../../models/user");
const s3Service = require("../S3/S3Service");
const Tools = require('../Tools/Tools')

async function getPortals(req, res) {
  try {
    const result = await Portal.find({});
    return res.status(200).send({ message: "Success", data: result })
  } catch (error) {
    return res.status(500).send({ message: error.message });
  }
}

function hashPassword(password) {
  let salt = bcrypt.genSaltSync();
  let hash = bcrypt.hashSync(password, salt);
  return hash;
}


async function syncWithUsers(portal, userUpdate) {
  try {
    const phoneNumber = uuid(); // temporary solution
    const portalName = portal.name.replaceAll(' ', '').replaceAll('-', '');
    const password = `${portalName}${phoneNumber}`;
    const existingUser = await User.findOne({ portalID: portal._id });

    if (!existingUser) {
      const user = new User({
        username: portal.name,
        email: `default+${portalName}@imaginecouncil.com`,
        phoneNumber: phoneNumber,
        type: 'pushuser',
        password: hashPassword(password),
        coinCount: '0',
        verified: userUpdate.active,
        bank: false,
        card: false,
        role: 'character',
        stripeID: '',
        birthDate: null,
        zone: '',
        hub: 'CGI',
        creative: 'Voice',
        favoriteColor: 'Red',
        onboarding: userUpdate.active,
        identification: '',
        nodeID: `/api/routes/media/image/${portal.icon.url}`,
        portalID: portal,
        verifiedPhone: userUpdate.active,
      });
      await User.register(user, password);
    } else {
      existingUser.username = portal.name;
      existingUser.onboarding = userUpdate.isActive;
      existingUser.verified = userUpdate.isActive;
      existingUser.verifiedPhone = userUpdate.isActive;
      existingUser.hub = userUpdate.hub;
      existingUser.creative = userUpdate.creative;
      existingUser.favoriteColor = userUpdate.favoriteColor;
      existingUser.nodeID = `/api/routes/media/image/${portal.icon.url}`;
      await existingUser.save();
    }
  } catch (e) {
    throw new Error(e.message);
  }
}

async function createPortal(req, res) {
  const values = req.body.values;
  const userUpdate = {
    active: values?.active,
    hub: values?.hub,
    creative: values?.creative,
    favoriteColor: values?.color,
  }

  try {
    if (!values.icon) {
      throw new Error('Please upload an icon');
    }
    const icon = await s3Service.uploadProductImageToS3(values.icon)

    const portal = new Portal({
      name: values?.name,
      description: values?.description,
      icon: icon,
      url: values?.url,
      active: values?.active,
    });
    await portal.save();
    await syncWithUsers(portal, userUpdate);
    return res.status(200).send({ message: "Success", data: portal })
  } catch (error) {
    return res.status(500).send({ message: error.message });
  }
}

async function updatePortal(req, res) {
  const values = req.body.values;
  const userUpdate = {
    active: values?.active,
    hub: values?.hub,
    creative: values?.creative,
    favoriteColor: values?.color,
  }

  try {
    const portal = await Portal.findById(req.body.portalId);
    portal.name = values?.name || portal.name;
    portal.description = values?.description || portal.description;
    portal.url = values?.url || portal.url;
    portal.active = values?.active ?? portal.active;
    if (values.icon) {
      const icon = await s3Service.uploadProductImageToS3(values.icon);
      portal.icon = icon;
    }
    await portal.save();
    await syncWithUsers(portal, userUpdate);
    return res.status(200).send({ message: "Success", data: portal })
  } catch (error) {
    return res.status(500).send({ message: error.message });
  }
}

module.exports = {
  getPortals,
  createPortal,
  updatePortal,
};
