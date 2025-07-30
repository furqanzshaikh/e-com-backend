const express = require('express');
const { PrismaClient } = require('../../generated/prisma');
const prisma = new PrismaClient();
/**

 * Create a new custom build
 */
exports.createCustomBuild = async (req, res) => {
  try {
    const { userId, buildName, components } = req.body;

    if (!userId || !buildName || !components) {
      return res.status(400).json({ error: 'Missing required fields.' });
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
    console.error('Error creating custom build:', error);
    res.status(500).json({ error: 'Internal server error.' });
  }
};

/**
 * Get all builds for a user
 */
exports.getBuildsByUser = async (req, res) => {
  try {
    const { userId } = req.params;

    const builds = await prisma.customBuild.findMany({
      where: { userId: parseInt(userId) },
      orderBy: { createdAt: 'desc' },
    });

    res.status(200).json(builds);
  } catch (error) {
    console.error('Error fetching builds:', error);
    res.status(500).json({ error: 'Internal server error.' });
  }
};

/**
 * Get a specific build by ID
 */
exports.getBuildById = async (req, res) => {
  try {
    const { id } = req.params;

    const build = await prisma.customBuild.findUnique({
      where: { id: parseInt(id) },
    });

    if (!build) return res.status(404).json({ error: 'Build not found' });

    res.status(200).json(build);
  } catch (error) {
    console.error('Error fetching build:', error);
    res.status(500).json({ error: 'Internal server error.' });
  }
};
