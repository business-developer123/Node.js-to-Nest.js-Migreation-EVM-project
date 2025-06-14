const GoPortalFeed = require('../../models/goPortalFeed');

const getGoPortalFeed = async (req, res) => {
    try {
        const goPortalFeed = await GoPortalFeed.find().sort({ updated_at: "desc" });
        return res.status(200).send({ message: 'GoPortalFeed fetched successfully', data: goPortalFeed });
    } catch (error) {
        return res.status(500).send({ message: error.message });
    }
}

const createGoPortalFeed = async (req, res) => {
    try {
        const values = req.body.values;

        const goPortalFeed = new GoPortalFeed({
            link: values.link,
            description: values.description,
            imageUrl: `/api/routes/media/file/${values.imageUrl}/image`
        });
        await goPortalFeed.save();

        io.emit("goPortalFeedCreated", goPortalFeed);
        return res.status(201).send({ message: 'GoPortalFeed created successfully', data: goPortalFeed });
    } catch (error) {
        return res.status(500).send({ message: error.message });
    }
}

const updateGoPortalFeed = async (req, res) => {
    try {
        const values = req.body.values;
        const id = req.params.id;

        const goPortalFeed = await GoPortalFeed.findById(id);

        if(!goPortalFeed) {
            throw new Error("GoPortalFeed not found");
        }

        goPortalFeed.imageUrl = values?.imageUrl || goPortalFeed.imageUrl;
        goPortalFeed.description = values?.description || goPortalFeed.description;
        goPortalFeed.link = values?.link || goPortalFeed.link;

        await goPortalFeed.save();
        return res.status(200).send({message: 'GoPortalFeed updated successfully', data: goPortalFeed});
    } catch (error) {
        return res.status(500).send({message: error.message});
    }
}

const deleteGoPortalFeed = async (req, res) => {
    try {
        console.log(req.params.id);
        const goPortalFeed = await GoPortalFeed.findByIdAndDelete(req.params.id);

        if (!goPortalFeed) {
            return res.status(404).send({message: 'GoPortalFeed not found'});
        }

        return res.status(200).send({message: 'GoPortalFeed deleted successfully'});
    } catch (error) {
        return res.status(500).send({message: error.message});
    }
}

module.exports = {
    getGoPortalFeed,
    createGoPortalFeed,
    updateGoPortalFeed,
    deleteGoPortalFeed
}
