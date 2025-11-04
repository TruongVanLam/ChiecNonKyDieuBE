import express from "express";
import cors from "cors";
import fetch from "node-fetch";
import dotenv from "dotenv";

dotenv.config();

const prizes = [
  { text: "GIẢI ĐỘC ĐẮC", code: "0001", limit: 1, weight: 5 }, // 2 giải
  { text: "BÌNH TRỮ SỮA KENDAMIL", code: "0002", limit: 1, weight: 15 },
  { text: "KHĂN DỊU ÊM", code: "0003", limit: 1, weight: 15 },
  { text: "TÚI KENDAMIL", code: "0004", limit: 1, weight: 20 },
  { text: "THÌA BÁO NÓNG 2 ĐẦU", code: "0005", limit: 1, weight: 20 },
  { text: "TÚI KENDAMIL & KHĂN DỊU ÊM", code: "0006", limit: 1, weight: 20 },
  { text: "CHÚC BẠN MAY MẮN LẦN SAU", code: "0007", limit: Infinity, weight: 300 }, // không giới hạn
  { text: "BÌNH TRỮ SỮA & KHĂN DỊU ÊM", code: "0008", limit: 1, weight: 20 },
];

const app = express();
app.use(cors());
app.use(express.json());

const accessToken = process.env.PAGE_ACCESS_TOKEN;
const urlSendMessage = process.env.URL_SEND_MESSAGE;

// Bộ nhớ tạm
const winners = {};          // { code: [contactId...] }
const blacklist = new Set(); // contactId đã confirm

// ------------------ API: SPIN ------------------
app.post("/api/spin", (req, res) => {
  const { contactId } = req.body;

  if (!contactId) {
    return res.status(400).json({ error: "Missing contactId" });
  }

  // Nếu user đã từng quay rồi thì không cho quay lại
  if (blacklist.has(contactId)) {
    return res.json({
      error: true,
      message: "Bạn đã tham gia rồi!"
    });
  }
  console.log("winner:", winners);
  

  // Xác định phần thưởng (và đảm bảo phần thưởng còn slot)
  const index = pickAvailablePrize();

  // Gửi kết quả về FE để FE hiển thị quay
  res.json({
    success: true,
    index
  });
});

// ------------------ API: CONFIRM ------------------
app.post("/api/confirm", async (req, res) => {
  try {
    const { contactId, prize } = req.body;
    console.log("🚀 Confirm request:", { contactId, prize });

    if (!contactId) {
      return res.status(400).json({ error: "Missing contactId or no pending prize" });
    }

    // Kiểm tra quota (nếu không phải ô may mắn lần sau)
    if (prize.code !== "0007") {
      if (!winners[prize.code]) winners[prize.code] = [];
      winners[prize.code].push(contactId);
    }

    // Xây tin nhắn
    let message = "";
    if (prize.code === "0007") {
      message = "Tiếc quá 🙁 mẹ chưa trúng thưởng rồi, mẹ theo dõi fanpage để cập nhật minigame hấp dẫn khác nhé";
    } else if (prize.code === "0001") {
      message =
        "🎉🎉🎉Chúc mừng mẹ đã trúng phần quà 2 tháng sử dụng Kendamil miễn phí, mỗi tháng tối đa 3 lon.\n" +
        "Mẹ hãy để lại thông tin: \n- HỌ TÊN\n- SĐT\n- ĐỊA CHỈ NHẬN HÀNG\nđể Kendamil gửi quà tới mẹ nha.";
    } else {
      message =
        `🎉🎉🎉Chúc mừng mẹ đã trúng phần quà ${prize.text}.\n` +
        "Mẹ hãy để lại thông tin: \n- HỌ TÊN\n- SĐT\n- ĐỊA CHỈ NHẬN HÀNG\nđể Kendamil gửi quà tới mẹ nha.";
    }

    // Gửi tin nhắn Messenger
    // await sendFbMessage(contactId, message);

    blacklist.add(contactId);

    console.log("✅ Tin nhắn đã gửi cho:", contactId);

    res.json({ success: true, message: "Tin nhắn đã gửi thành công!" });
  } catch (error) {
    console.error("❌ Error sending message:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// ------------------ Helper Functions ------------------
function pickAvailablePrize() {
  const available = prizes
    .map((p, i) => ({ ...p, index: i })) // thêm index vào từng phần tử
    .filter(p => (winners[p.code]?.length || 0) < p.limit);

  if (available.length === 0) {
    return 6; // Chúc bạn may mắn lần sau
  }

  const totalWeight = available.reduce((sum, p) => sum + p.weight, 0);
  let random = Math.random() * totalWeight;

  for (const prize of available) {
    random -= prize.weight;
    if (random <= 0) {
      return prize.index;
    }
  }
  return available[available.length - 1].index;
}

async function sendFbMessage(contactId, message) {
  const response = await fetch(`${urlSendMessage}?access_token=${accessToken}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      recipient: { id: contactId },
      message: { text: message }
    })
  });

  const result = await response.json();
  if (result.error) throw new Error(result.error.message);
}

// ------------------ Start Server ------------------
app.listen(3000, () => console.log("🚀 Server running on port 3000"));
