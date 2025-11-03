import express from "express";
import cors from "cors";
import fetch from "node-fetch";
import dotenv from "dotenv";

dotenv.config();

const app = express();

app.use(cors());
app.use(express.json());

const accessToken = process.env.PAGE_ACCESS_TOKEN;
const urlSendMessage = process.env.URL_SEND_MESSAGE;

const blacklist = new Set();

app.post("/api/send-prize", async (req, res) => {
  try {
    const { contactId, prize } = req.body;

    if (!contactId || !prize) {
      return res.status(400).json({ error: "Missing contactId or prize" });
    }

    // Kiểm tra trước xem người này đã quay chưa
    if (blacklist.has(contactId)) {
      const alreadyMsg = `Mẹ đã tham gia quay rồi, hãy theo dõi fanpage để cập nhật minigame hấp dẫn khác nhé`;

      // Gửi tin nhắn từ chối
      await sendFbMessage(contactId, alreadyMsg);
      return res.json({ success: false, message: "Người dùng đã chơi rồi" });
    }

    // Nếu chưa trong blacklist → xử lý trúng thưởng
    let message = "";
    if (prize.code == "0007") {
      message = `Tiếc quá 🙁 mẹ chưa trúng thưởng rồi, mẹ theo dõi fanpage để cập nhật minigame hấp dẫn khác nhé`;
    } else if (prize.code == "0001") {
      message = `🎉🎉🎉Chúc mừng mẹ đã trúng phần quà 2 tháng sử dụng Kendamil miễn phí, mỗi tháng tối đa 3 lon.\nMẹ hãy để lại thông tin: \n- HỌ TÊN\n- SĐT\n- ĐỊA CHỈ NHẬN HÀNG\nđể Kendamil gửi quà tới mẹ nha.`;
    } else {
      message = `🎉🎉🎉Chúc mừng mẹ đã trúng phần quà ${prize.text}.\nMẹ hãy để lại thông tin: \n- HỌ TÊN\n- SĐT\n- ĐỊA CHỈ NHẬN HÀNG\nđể Kendamil gửi quà tới mẹ nha.`;
    }

    await sendFbMessage(contactId, message);

    blacklist.add(contactId);
    console.log("✅ Added to blacklist:", contactId);

    res.json({ success: true, message: "Tin nhắn đã gửi thành công!" });
  } catch (error) {
    console.error("❌ Error sending message:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

async function sendFbMessage(contactId, message) {
  const response = await fetch(
    `${urlSendMessage}?access_token=${accessToken}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        recipient: { id: contactId },
        message: { text: message }
      })
    }
  );
  const result = await response.json();
  if (result.error) throw new Error(result.error.message);
  console.log("📤 FB API Response:", result);
}

app.listen(3000, () => console.log("🚀 Server running on port 3000"));
