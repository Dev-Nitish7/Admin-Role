import pool from '../config/db.js';
import { containerClient, generateBlobSASUrl } from '../config/azureBlob.js';

// Upload to Azure Blob Storage
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

    const result = await pool.query(
      `INSERT INTO user_files (user_id, filename, blobname) 
       VALUES ($1, $2, $3) RETURNING id, filename, blobname`,
      [userId, file.originalname, blobName]
    );

    // Optional: send URL in response (for immediate preview)
    const fileurl = await generateBlobSASUrl(blobName);

    res.status(201).json({
      message: "File uploaded successfully",
      file: {
        ...result.rows[0],
        fileurl
      }
    });
  } catch (err) {
    console.error("Upload Error:", err);
    res.status(500).json({ message: "Upload failed" });
  }
};


// Get files uploaded by the logged-in user
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

// Get all files (accessible to all authenticated users)
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






export const downloadFile = async (req, res) => {
  const fileId = req.params.id;

  try {
    const result = await pool.query(
      'SELECT blobname FROM user_files WHERE id = $1',
      [fileId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'File not found' });
    }

    const blobName = result.rows[0].blobname;
    const downloadUrl = await generateBlobSASUrl(blobName);

    return res.status(200).json({ downloadUrl });

  } catch (err) {
    console.error('Error generating SAS URL:', err);
    res.status(500).json({ message: 'Server error during file download' });
  }
};
