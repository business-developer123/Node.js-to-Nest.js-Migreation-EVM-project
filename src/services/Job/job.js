const Job = require("../../models/job");

async function createJob(jobData) {
    let existingJob = await Job.find({ name: jobData.name })
    if (!existingJob.length) {
        let endVotePhaseJob = new Job({
            name: jobData.name,
            startTime: jobData.startTime,
            args: jobData.args,
            endTime: jobData.endTime,
            rule: jobData.rule,
            what: jobData.what
        })
        await endVotePhaseJob.save()
    }
}

async function removePending(jobName) {
    let existingJob = await Job.findOne({ name: jobName })
    if (existingJob) {
        existingJob.pending = false
        existingJob.save()
    }
}

module.exports = {
  createJob,
  removePending
};
