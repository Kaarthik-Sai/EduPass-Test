import QRCode from "qrcode";
import crypto from "crypto";

export const generatePermissionQR = async (permissionId) => {
  const qrToken = crypto.randomBytes(32).toString("hex");

  const qrCode = await QRCode.toDataURL(
    JSON.stringify({
      permissionId: permissionId.toString(),
      token: qrToken,
    }),
  );

  return {
    qrCode,
    qrToken,
    qrGeneratedAt: new Date(),
  };
};
