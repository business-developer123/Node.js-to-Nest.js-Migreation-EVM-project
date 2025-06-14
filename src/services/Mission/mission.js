const Mongoose = require("mongoose");
const Mission = require("../../models/mission");
const Product = require("../../models/product");

async function createMission(missionData) {
  
  const session = await Mongoose.startSession();
  session.startTransaction();
  
  
  let mission = new Mission({
      audioContent: missionData.audioContent,
      videoContent: missionData.videoContent,
      podcastContent: missionData.podcastContent,
      brandId: missionData.brandId,
      themeColor: missionData.themeColor,
      missionLength: missionData.missionLength,
      productIds: missionData.productIds
    })
  await mission.save().catch(error => {
    console.log('Unable to create mission, ' + error)
    session.abortTransaction()
    session.endSession()
    return res.status(500).send({message : 'Unable to create mission, ' + error})
  })
  
  await session.commitTransaction()
  session.endSession()
  
  return { message: "Success", status: 200, mission: mission };
}

async function getMissions() {
    let missions = await Mission.find();
   
    for (m of missions) {
        if (m.productIds.length) {
            for (pId of m.productIds) {
                let product = await Product.findById(pId)
                m.products.push(product)
            }
        }
    }
   
    return { message : 'Success', missions: missions }
}

module.exports = {
  createMission,
  getMissions
};
