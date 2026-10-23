#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import process from "node:process";

const projectRoot = process.cwd();
const manifestPath = path.join(projectRoot, "tuya-api-manifest.json");

const LOGIN_API_PATHS = new Set([
  "/v1.0/end-user/services/auth-login-qr",
  "/v1.0/end-user/services/auth-login-qr/result",
  "/v1.0/end-user/services/authorizations/exchange",
  "/v1.0/end-user/services/auth-login-token/{refresh_token}",
]);

const CANONICAL_DEVICE_APIS = new Map([
  ["getHomes", "GET:/v1.0/end-user/homes/all"],
  ["getRooms", "GET:/v1.0/end-user/homes/{home_id}/rooms"],
  ["getAllDevices", "GET:/v1.0/end-user/devices/all"],
  ["getDevicesByHome", "GET:/v1.0/end-user/homes/{home_id}/devices"],
  ["getDevicesByRoom", "GET:/v1.0/end-user/homes/room/{room_id}/devices"],
  ["getDeviceDetail", "GET:/v1.0/end-user/devices/{device_id}/detail"],
  ["getDeviceModel", "GET:/v1.0/end-user/devices/{device_id}/model"],
  [
    "issueProperties",
    "POST:/v1.0/end-user/devices/{device_id}/shadow/properties/issue",
  ],
  ["renameDevice", "POST:/v1.0/end-user/devices/{device_id}/attribute"],
  ["getWeather", "GET:/v1.0/end-user/services/weather/recent"],
  ["sendSms", "POST:/v1.0/end-user/services/sms/self-send"],
  ["sendVoice", "POST:/v1.0/end-user/services/voice/self-send"],
  ["sendEmail", "POST:/v1.0/end-user/services/mail/self-send"],
  ["sendPush", "POST:/v1.0/end-user/services/push/self-send"],
  ["getStatisticsConfig", "GET:/v1.0/end-user/statistics/hour/config"],
  ["getStatisticsData", "GET:/v1.0/end-user/statistics/hour/data"],
  ["ipcCaptureAllocate", "POST:/v1.0/end-user/ipc/{device_id}/capture/allocate"],
  ["ipcCaptureResolve", "POST:/v1.0/end-user/ipc/{device_id}/capture/resolve"],
  [
    "ipcCaptureImageSummary",
    "POST:/v1.0/end-user/ipc/{device_id}/ai/detect/image/summary",
  ],
  ["ipcLiveHlsAllocate", "POST:/v1.0/end-user/ipc/{device_id}/stream/hls/allocate"],
  ["ipcLiveHlsKey", "GET:/v1.0/end-user/ipc/{device_id}/stream/hls/key"],
  ["ipcSdRecordingHlsAllocate", "POST:/v1.0/end-user/ipc/{device_id}/sd/recording/hls"],
  ["ipcSdRecordingList", "POST:/v1.0/end-user/ipc/{device_id}/sd/recording/list"],
  [
    "ipcSdRecordingPlayback",
    "POST:/v1.0/end-user/ipc/{device_id}/sd/recording/playback",
  ],
  [
    "ipcSdRecordingPlaybackStatus",
    "GET:/v1.0/end-user/ipc/{device_id}/sd/recording/playback/status",
  ],
  [
    "ipcSdRecordingPlaybackKey",
    "GET:/v1.0/end-user/ipc/{device_id}/sd/recording/playback/key",
  ],
  [
    "ipcSdRecordingPlaybackClose",
    "POST:/v1.0/end-user/ipc/{device_id}/sd/recording/playback/close",
  ],
]);

function walkSourceFiles(directory, files = []) {
  if (!fs.existsSync(directory)) return files;

  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    if (entry.name === "node_modules" || entry.name.startsWith(".")) continue;

    const fullPath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      walkSourceFiles(fullPath, files);
    } else if (/\.(ts|tsx|js|jsx|mjs|cjs)$/.test(entry.name)) {
      files.push(fullPath);
    }
  }

  return files;
}

function sourceFiles() {
  return ["src", "app", "server", "lib"]
    .flatMap((directory) => walkSourceFiles(path.join(projectRoot, directory)))
    .filter((file) => !file.endsWith("tuya-client.ts"));
}

function relative(file) {
  return path.relative(projectRoot, file);
}

function scanUsage() {
  const loginUsage = [];
  const deviceUsage = new Map();
  const dynamicTuyaCalls = [];

  for (const file of sourceFiles()) {
    const content = fs.readFileSync(file, "utf8");
    const lines = content.split(/\r?\n/);

    lines.forEach((line, index) => {
      if (/\/v(?:1\.0|1\.1|2\.0)\//.test(line)) {
        loginUsage.push(`${relative(file)}:${index + 1}`);
      }

      for (const [method, canonicalApi] of CANONICAL_DEVICE_APIS) {
        const callPattern = new RegExp(`\\.${method}\\s*\\(`);
        if (callPattern.test(line)) {
          deviceUsage.set(canonicalApi, `${relative(file)}:${index + 1}`);
        }
      }

      if (/TuyaClient\s*\(/.test(line) || /new\s+TuyaClient/.test(line)) {
        dynamicTuyaCalls.push(`${relative(file)}:${index + 1}`);
      }
    });
  }

  return { loginUsage, deviceUsage, dynamicTuyaCalls };
}

function errorsForMissingManifest() {
  const { loginUsage, deviceUsage } = scanUsage();
  if (deviceUsage.size > 0) {
    return [
      "tuya-api-manifest.json is missing, but Tuya End User API usage was detected.",
      "Generate it according to tuya-app-login-skill and run this check again.",
    ];
  }

  if (loginUsage.length > 0) {
    return [
      "tuya-api-manifest.json is missing, but Tuya login API usage was detected.",
      'Generate it with "tuya_enduser_apis": [] because login infrastructure APIs are excluded.',
    ];
  }

  return [];
}

function parseManifest() {
  if (!fs.existsSync(manifestPath)) return { errors: errorsForMissingManifest() };

  let manifest;
  try {
    manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
  } catch (error) {
    return { errors: [`tuya-api-manifest.json is not valid JSON: ${error.message}`] };
  }

  const errors = [];
  if (manifest.schema_version !== "1.0") {
    errors.push('schema_version must be "1.0".');
  }
  if (
    typeof manifest.generated_at !== "string" ||
    Number.isNaN(Date.parse(manifest.generated_at))
  ) {
    errors.push("generated_at must be an ISO 8601 timestamp.");
  }
  if (!Array.isArray(manifest.tuya_enduser_apis)) {
    errors.push("tuya_enduser_apis must be an array.");
    return { errors, manifest };
  }
  if (manifest.tuya_enduser_apis.some((api) => typeof api !== "string")) {
    errors.push("Every tuya_enduser_apis entry must be a string.");
  }

  return { errors, manifest };
}

function validateManifest(manifest, errors) {
  const apis = manifest.tuya_enduser_apis.filter((api) => typeof api === "string");
  const expected = new Set(CANONICAL_DEVICE_APIS.values());
  const actual = new Set(apis);
  const { deviceUsage } = scanUsage();

  for (const api of apis) {
    const [method, apiPath] = api.split(/:(.+)/);
    if (!method || method !== method.toUpperCase() || !apiPath?.startsWith("/")) {
      errors.push(`Invalid API format: ${api}. Expected "METHOD:/path".`);
    }
    if (LOGIN_API_PATHS.has(apiPath)) {
      errors.push(`Login infrastructure API must be excluded: ${api}`);
    }
  }

  for (const api of actual) {
    if (!expected.has(api)) {
      errors.push(`Unexpected Tuya End User API: ${api}`);
    }
  }

  for (const api of expected) {
    if (actual.has(api)) continue;
    if (deviceUsage.has(api)) {
      errors.push(`Missing Tuya End User API: ${api}`);
    }
  }

  if (deviceUsage.size === 0 && actual.size > 0) {
    errors.push(
      "tuya_enduser_apis must be empty when no Tuya End User API usage is detected."
    );
  }

  const sorted = [...apis].sort((left, right) => left.localeCompare(right));
  if (apis.some((api, index) => api !== sorted[index])) {
    errors.push("tuya_enduser_apis must be deduplicated and sorted in ascending order.");
  }

  if (deviceUsage.size === 0) {
    const { dynamicTuyaCalls } = scanUsage();
    if (dynamicTuyaCalls.length > 0) {
      errors.push(
        "TuyaClient usage was detected, but no recognized End User API call was found. Use a TuyaClient method with a documented endpoint so it can be validated."
      );
    }
  }

  return { expected };
}

function main() {
  const { errors, manifest } = parseManifest();
  if (!manifest) {
    if (errors.length === 0) {
      console.log("PASS: no Tuya API usage detected; tuya-api-manifest.json is not required.");
      return;
    }
  } else if (errors.length === 0 || Array.isArray(manifest.tuya_enduser_apis)) {
    validateManifest(manifest, errors);
  }

  if (errors.length > 0) {
    console.error("FAIL: Tuya API manifest check failed.");
    for (const error of errors) console.error(`- ${error}`);
    process.exitCode = 1;
    return;
  }

  console.log(
    `PASS: Tuya API manifest is valid (${manifest.tuya_enduser_apis.length} APIs).`
  );
}

main();
