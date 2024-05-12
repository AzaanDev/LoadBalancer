document.addEventListener("DOMContentLoaded", function () {
  fetch("/api/videos")
    .then((response) => response.json())
    .then((data) => {
      const list = document.getElementById("videoList");
      data.forEach((video) => {
        const item = document.createElement("li");
        item.textContent = `${video.title} - Views: ${video.views}`;
        list.appendChild(item);
      });
    })
    .catch((error) => console.error("Error loading videos:", error));
});

document.addEventListener("DOMContentLoaded", function () {
  var video = document.getElementById("video");
  if (Hls.isSupported()) {
    var hls = new Hls();
    hls.loadSource("https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8"); // Replace with your HLS URL
    hls.attachMedia(video);
    hls.on(Hls.Events.MANIFEST_PARSED, function () {
      video.play();
    });
  } else if (video.canPlayType("application/vnd.apple.mpegurl")) {
    video.src = "https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8"; // Replace with your HLS URL
    video.addEventListener("canplay", function () {
      video.play();
    });
  }
});
