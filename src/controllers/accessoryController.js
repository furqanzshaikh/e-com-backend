// const { PrismaClient } = require('../../generated/prisma');
// const prisma = new PrismaClient();

// // CREATE Accessory
// exports.createAccessory = async (req, res) => {
//   try {
//     const {
//       name,
//       description,
//       actualPrice,
//       sellingPrice,
//       brand,
//       compatibility,
//       boxpack,
//       stock,
//       images = [],
//     } = req.body;

//     // Validate required fields
//     if (!name || !actualPrice || !sellingPrice || !stock) {
//       return res.status(400).json({
//         success: false,
//         message: 'Missing required fields: name, actualPrice, sellingPrice, stock',
//       });
//     }

//     // Create accessory with images
//     const accessory = await prisma.accessory.create({
//       data: {
//         name,
//         description,
//         actualPrice,
//         sellingPrice,
//         brand,
//         compatibility,
//         boxpack,
//         stock,
//         images: {
//           create: images.map((img) => ({
//             url: img.url,
//             alt: img.alt || name,
//           })),
//         },
//       },
//       include: { images: true },
//     });

//     res.status(201).json({ success: true, data: accessory });
//   } catch (error) {
//     console.error('Accessory creation error:', error);
//     res.status(500).json({
//       success: false,
//       message: 'Failed to create accessory',
//       error: error.message || error,
//     });
//   }
// };

// // READ All Accessories
// exports.getAllAccessories = async (req, res) => {
//   try {
//     const accessories = await prisma.accessory.findMany({
//       include: { images: true },
//     });
//     res.json({ success: true, data: accessories });
//   } catch (error) {
//     res.status(500).json({ success: false, message: 'Failed to fetch accessories' });
//   }
// };

// // READ Accessory by ID
// exports.getAccessoryById = async (req, res) => {
//   try {
//     const id = parseInt(req.params.id);
//     const accessory = await prisma.accessory.findUnique({
//       where: { id },
//       include: { images: true },
//     });

//     if (!accessory) {
//       return res.status(404).json({ success: false, message: 'Accessory not found' });
//     }

//     res.json({ success: true, data: accessory });
//   } catch (error) {
//     res.status(500).json({ success: false, message: 'Failed to fetch accessory' });
//   }
// };

// // UPDATE Accessory
// exports.updateAccessory = async (req, res) => {
//   try {
//     const id = parseInt(req.params.id);
//     const {
//       name,
//       description,
//       actualPrice,
//       sellingPrice,
//       brand,
//       compatibility,
//       boxpack,
//       stock,
//     } = req.body;

//     const accessory = await prisma.accessory.update({
//       where: { id },
//       data: {
//         name,
//         description,
//         actualPrice,
//         sellingPrice,
//         brand,
//         compatibility,
//         boxpack,
//         stock,
//         updatedAt: new Date(),
//       },
//       include: { images: true },
//     });

//     res.json({ success: true, data: accessory });
//   } catch (error) {
//     res.status(500).json({ success: false, message: 'Failed to update accessory' });
//   }
// };

// // DELETE Accessory
// exports.deleteAccessory = async (req, res) => {
//   try {
//     const id = parseInt(req.params.id);

//     // Delete related images first
//     await prisma.accessoryImage.deleteMany({ where: { accessoryId: id } });

//     // Then delete the accessory
//     await prisma.accessory.delete({ where: { id } });

//     res.json({ success: true, message: 'Accessory deleted successfully' });
//   } catch (error) {
//     res.status(500).json({ success: false, message: 'Failed to delete accessory' });
//   }
// };
