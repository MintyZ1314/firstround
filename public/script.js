document.getElementById("uploadForm").addEventListener("submit", async (e) => {
  e.preventDefault();

  const form = e.target;
  const name = document.getElementById("name").value;
  const image = document.getElementById("imageInput").files[0];
  const button = form.querySelector("button");

  if (!name || !image) return;

  button.disabled = true;
  const originalText = button.innerHTML;
  button.innerHTML = "⏳ Đang gửi...";

  const formData = new FormData();
  formData.append("name", name);
  formData.append("image", image);

  const limitMessage = document.getElementById("limitMessage");

  try {
    const response = await fetch("/upload", {
      method: "POST",
      body: formData,
    });

    if (response.ok) {
      button.innerHTML = "✅ Đã gửi!";
      form.reset();
      limitMessage.textContent = "";
    } else {
      limitMessage.textContent = "❌ Gửi lỗi, thử lại sau.";
      button.innerHTML = originalText;
    }
  } catch (err) {
    console.error(err);
    limitMessage.textContent = "❌ Lỗi mạng, thử lại.";
    button.innerHTML = originalText;
  }

  setTimeout(() => {
    button.innerHTML = originalText;
    button.disabled = false;
  }, 2000);
});
