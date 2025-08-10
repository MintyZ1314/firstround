// server.js
require("dotenv").config();
const express = require("express");
const multer = require("multer");
const cors = require("cors");
const cloudinary = require("cloudinary").v2;
const { v4: uuidv4 } = require("uuid");
const path = require("path");

const app = express();
const port = process.env.PORT || 3000;

app.use(cors());
app.use(express.static(path.join(__dirname, "public")));

const upload = multer({ storage: multer.memoryStorage() });

cloudinary.config({
  cloud_name: process.env.CLOUD_NAME,
  api_key: process.env.API_KEY,
  api_secret: process.env.API_SECRET,
});

const submissions = [];
const duplicatesSubmissions = [];

app.post("/upload", upload.single("image"), async (req, res) => {
  const name = req.body.name.trim();
  const fileBuffer = req.file.buffer;

  const alreadyExists = submissions.some((s) => s.name === name);

  const uploadStream = cloudinary.uploader.upload_stream(
    { folder: "web_uploads", public_id: uuidv4() },
    (error, result) => {
      if (error) {
        console.error("Upload lỗi:", error);
        return res.status(500).send("Lỗi upload");
      }

      const newEntry = {
        id: uuidv4(),
        name,
        imageUrl: result.secure_url,
        createdAt: new Date(),
      };

      if (alreadyExists) {
        duplicatesSubmissions.push(newEntry);
        return res.status(200).send("Ảnh mới được lưu vào duplicates");
      }

      submissions.push(newEntry);
      res.status(200).send("Upload thành công");
    }
  );

  uploadStream.end(fileBuffer);
});

app.get("/admin", (req, res) => {
  const secret = req.query.secret;
  if (secret === "minty0765119179") {
    res.sendFile(path.join(__dirname, "admin", "admin.html"));
  } else {
    res.status(403).send("Không có quyền truy cập");
  }
});

app.get("/admin-data", (req, res) => {
  const total = submissions.length;
  res.json({ total, submissions });
});

app.delete("/delete", async (req, res) => {
  const id = req.query.id;

  // Tìm ảnh cần xoá trong cả 2 mảng
  const removeFrom = (arr) => {
    const index = arr.findIndex((s) => s.id === id);
    if (index !== -1) {
      arr.splice(index, 1);
      return true;
    }
    return false;
  };

  const removed = removeFrom(submissions) || removeFrom(duplicatesSubmissions);

  if (!removed) {
    return res.status(404).send("Không tìm thấy ảnh");
  }

  res.sendStatus(200);
});

app.get("/duplicate", (req, res) => {
  const secret = req.query.secret;
  if (secret === "minty0765119179") {
    res.sendFile(path.join(__dirname, "admin", "admin-duplicates.html"));
  } else {
    res.status(403).send("Không có quyền truy cập");
  }
});

app.get("/duplicates-data", (req, res) => {
  const all = [...submissions, ...duplicatesSubmissions];
  const nameMap = new Map();

  for (const submission of all) {
    const list = nameMap.get(submission.name) || [];
    list.push(submission);
    nameMap.set(submission.name, list);
  }

  const duplicates = [];
  for (const [name, list] of nameMap.entries()) {
    if (list.length >= 2) {
      // sắp xếp theo thời gian gửi (ảnh đầu tiên là ảnh đang dùng)
      const sorted = list.sort(
        (a, b) => new Date(a.createdAt) - new Date(b.createdAt)
      );
      const rest = sorted.slice(1); // bỏ ảnh đầu tiên
      duplicates.push({ name, photos: rest });
    }
  }

  res.json({ duplicates });
});

// xác nhận 1 ảnh => chuyển ảnh đó thành chính
app.post("/confirm-photo", (req, res) => {
  const { id, name } = req.query;

  // Tìm ảnh mới (vừa được chọn) trong duplicatesSubmissions
  const chosen = duplicatesSubmissions.find(
    (s) => s.id === id && s.name === name
  );
  if (!chosen)
    return res.status(404).send("Không tìm thấy ảnh trong duplicates");

  // Tìm vị trí của ảnh gốc trong submissions[]
  const index = submissions.findIndex((s) => s.name === name);
  if (index === -1)
    return res.status(404).send("Không tìm thấy ảnh chính thức");

  // Cập nhật imageUrl (và optionally updated time)
  submissions[index].imageUrl = chosen.imageUrl;
  submissions[index].createdAt = new Date(); // optional

  // Xoá tất cả ảnh của tên đó trong duplicatesSubmissions
  for (let i = duplicatesSubmissions.length - 1; i >= 0; i--) {
    if (duplicatesSubmissions[i].name === name) {
      duplicatesSubmissions.splice(i, 1);
    }
  }

  res.sendStatus(200);
});

app.get("/official-photo", (req, res) => {
  const name = req.query.name;
  const found = submissions.find((s) => s.name === name);
  if (!found) return res.status(404).send("Không tìm thấy ảnh chính thức");
  res.json({ imageUrl: found.imageUrl });
});

app.listen(port, () => {
  console.log(`Server chạy tại http://localhost:${port}`);
});
