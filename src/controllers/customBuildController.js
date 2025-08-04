const { PrismaClient } = require('../../generated/prisma');
const prisma = new PrismaClient();

/**
 * Create a new custom build
 */
exports.createCustomBuild = async (req, res) => {
  try {
    const { buildName, components } = req.body;
    const userId = req.userId; 

    if (!buildName || !components || !Array.isArray(components)) {
      return res.status(400).json({ error: 'Missing or invalid fields.' });
    }

    const newBuild = await prisma.customBuild.create({
      data: {
        userId,
        buildName,
        components,
      },
    });

    res.status(201).json(newBuild);
  } catch (error) {
    console.error('❌ Error creating custom build:', error);
    res.status(500).json({ error: 'Internal server error.' });
  }
};

/**
 * Get all builds for the logged-in user
 */
exports.getBuildsByUser = async (req, res) => {
  try {
    const userId = req.userId; // ✅ Extract userId from token

    const builds = await prisma.customBuild.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });

    res.status(200).json(builds);
  } catch (error) {
    console.error('❌ Error fetching builds:', error);
    res.status(500).json({ error: 'Internal server error.' });
  }
};

/**
 * Get a specific build by ID
 */
exports.getBuildById = async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const userId = req.userId;

    if (isNaN(id)) return res.status(400).json({ error: 'Invalid build ID' });

    const build = await prisma.customBuild.findFirst({
      where: {
        id,
        userId // ✅ Ensure user can access only their own build
      }
    });

    if (!build) return res.status(404).json({ error: 'Build not found' });

    res.status(200).json(build);
  } catch (error) {
    console.error('❌ Error fetching build:', error);
    res.status(500).json({ error: 'Internal server error.' });
  }
};

/**
 * Update a custom build by ID
 */
exports.updateBuildById = async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { buildName, components } = req.body;
    const userId = req.userId;

    if (isNaN(id)) return res.status(400).json({ error: 'Invalid build ID' });

    const existingBuild = await prisma.customBuild.findFirst({
      where: { id, userId }
    });

    if (!existingBuild) return res.status(404).json({ error: 'Build not found' });

    const updatedBuild = await prisma.customBuild.update({
      where: { id },
      data: {
        buildName,
        components,
      },
    });

    res.status(200).json(updatedBuild);
  } catch (error) {
    console.error('❌ Error updating build:', error);
    res.status(500).json({ error: 'Internal server error.' });
  }
};

/**
 * Delete a build by ID
 */
exports.deleteBuildById = async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const userId = req.userId;

    if (isNaN(id)) return res.status(400).json({ error: 'Invalid build ID' });

    const existingBuild = await prisma.customBuild.findFirst({
      where: { id, userId }
    });

    if (!existingBuild) return res.status(404).json({ error: 'Build not found' });

    const deletedBuild = await prisma.customBuild.delete({
      where: { id },
    });

    res.status(200).json({ message: 'Build deleted successfully', deletedBuild });
  } catch (error) {
    console.error('❌ Error deleting build:', error);
    res.status(500).json({ error: 'Internal server error.' });
  }
};
