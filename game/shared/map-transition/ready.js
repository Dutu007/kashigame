// Decode artwork before reveal; start the animation only when shown.
const lineFx = document.getElementById('lineFx');
lineFx.pauseAnimations();
window.transitionReady = Promise.all(Array.from(document.images, image => image.decode().catch(() => {})));
window.startTransition = () => {
  document.body.classList.remove('paused');
  lineFx.setCurrentTime(0);
  lineFx.unpauseAnimations();
};
