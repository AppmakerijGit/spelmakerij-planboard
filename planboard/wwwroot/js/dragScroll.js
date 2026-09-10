let _dragScrollHandler = null;

window.startDragScroll = function () {
    if (_dragScrollHandler) return;
    _dragScrollHandler = function (e) {
        const threshold = 80;
        const speed = 12;
        if (e.clientY < threshold) window.scrollBy(0, -speed);
        else if (e.clientY > window.innerHeight - threshold) window.scrollBy(0, speed);
    };
    document.addEventListener('dragover', _dragScrollHandler);
};

window.stopDragScroll = function () {
    if (_dragScrollHandler) {
        document.removeEventListener('dragover', _dragScrollHandler);
        _dragScrollHandler = null;
    }
};
