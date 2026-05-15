import express from 'express';
import path from 'path';
import fs from 'fs/promises';
import { createServer as createViteServer } from 'vite';

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // API kiểm tra mật khẩu VIP
  app.post('/api-verify-vip', async (req, res) => {
    try {
      const { password } = req.body;
      const pwdFile = path.join(process.cwd(), 'passwords.txt');
      
      let contents = '';
      try {
        contents = await fs.readFile(pwdFile, 'utf-8');
      } catch (err) {
        // Fallback nếu file chưa tồn tại
        contents = 'admin123';
      }

      // Xử lý các dòng, loại bỏ khoảng trắng và dòng comment (#)
      const passwords = contents.split('\n')
        .map(p => p.trim())
        .filter(p => p.length > 0 && !p.startsWith('#'));

      if (passwords.includes(password)) {
        res.json({ success: true });
      } else {
        res.status(401).json({ success: false, message: 'Mật khẩu không hợp lệ' });
      }
    } catch (err) {
      console.error('Lỗi server:', err);
      res.status(500).json({ success: false, message: 'Lỗi máy chủ nội bộ' });
    }
  });

  // Vite middleware cho development
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    // Phục vụ file tĩnh cho production
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server chạy trên http://0.0.0.0:${PORT}`);
  });
}

startServer();
