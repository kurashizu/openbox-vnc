import RFB from "/novnc/rfb.js";
globalThis.__novnc_RFB__ = RFB;
globalThis.dispatchEvent(new CustomEvent("__novnc_ready__"));
