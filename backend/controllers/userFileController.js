import pool from '../config/db.js';
import { containerClient, generateBlobSASUrl } from '../config/azureBlob.js';

// Upload to Azure
export const uploadFileToAzure = async (req, res) => {
  try {
    const { id: userId } = req.user;
    const file = req.file;

    if (!file) return res.status(400).json({ message: 'No file uploaded' });

    const blobName = `${Date.now()}-${file.originalname}`;
    const blockBlobClient = containerClient.getBlockBlobClient(blobName);

    await blockBlobClient.uploadData(file.buffer, {
      blobHTTPHeaders: { blobContentType: file.mimetype },
    });

    const sasUrl = await generateBlobSASUrl(blobName);

    const result = await pool.query(
      `INSERT INTO user_files (user_id, filename, fileurl, blobname) 
       VALUES ($1, $2, $3, $4) RETURNING id, filename, fileurl`,
      [userId, file.originalname, sasUrl, blobName]
    );

    res.status(201).json({ message: "File uploaded successfully", file: result.rows[0] });
  } catch (err) {
    console.error("Upload Error:", err);
    res.status(500).json({ message: "Upload failed" });
  }
};

// View own files
export const getUserFiles = async (req, res) => {
  try {
    const { id: userId } = req.user;

    const result = await pool.query(
      "SELECT id, filename, blobname FROM user_files WHERE user_id = $1 ORDER BY id ASC",
      [userId]
    );

    const filesWithSas = await Promise.all(
      result.rows.map(async (file) => ({
        id: file.id,
        filename: file.filename,
        fileurl: await generateBlobSASUrl(file.blobname),
      }))
    );

    res.status(200).json({ files: filesWithSas });
  } catch (err) {
    console.error("Fetch error:", err);
    res.status(500).json({ message: "Error fetching files" });
  }
};

// View all files (for all users)
export const getAllFiles = async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT id, filename, blobname FROM user_files ORDER BY id ASC"
    );

    const filesWithSas = await Promise.all(
      result.rows.map(async (file) => ({
        id: file.id,
        filename: file.filename,
        fileurl: await generateBlobSASUrl(file.blobname),
      }))
    );

    res.status(200).json({ files: filesWithSas });
  } catch (err) {
    console.error("Fetch error:", err);
    res.status(500).json({ message: "Error fetching all files" });
  }
};
