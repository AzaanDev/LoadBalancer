document.addEventListener("DOMContentLoaded", function () {
  fetch("/api/videos")
    .then((response) => response.json())
    .then((data) => {
      const list = document.getElementById("videoList");
      const video = document.getElementById("video");
      video.style.display = "none";

      data.forEach((video) => {
        const item = document.createElement("li");
        item.textContent = `${video.title} - Views: ${video.views}`;
        item.onclick = function () {
          fetch(`/ld/video?title=${encodeURIComponent(video.title)}`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ title: video.title }),
          })
            .then((response) => response.json())
            .then((data) => {
              console.log("Video loaded:", data);
              video.src = data.url;
              LoadVideo(video.src);
            })
            .catch((error) => console.error("Error loading video:", error));
        };
        list.appendChild(item);
      });
    })
    .catch((error) => console.error("Error loading videos:", error));
});

function LoadVideo(videoUrl) {
  var video = document.getElementById("video");
  video.style.display = "block";
  if (Hls.isSupported()) {
    var hls = new Hls();
    hls.loadSource(videoUrl);
    hls.attachMedia(video);
    hls.on(Hls.Events.MANIFEST_PARSED, function () {
      video.play();
    });
  } else if (video.canPlayType("application/vnd.apple.mpegurl")) {
    video.src = videoUrl;
    video.addEventListener("canplay", function () {
      video.play();
    });
  }
}
