import { AzureFunction, Context, HttpRequest } from "@azure/functions"

const httpTrigger: AzureFunction = async function (context: Context, req: HttpRequest): Promise<void> {
    try {
        const url = new URL(req.url);
        const refererUrl = decodeURIComponent(url.searchParams.get("referer") || "");
        const targetUrl = decodeURIComponent(url.searchParams.get("url") || "");
        const originUrl = decodeURIComponent(url.searchParams.get("origin") || "");

        if (!targetUrl) {
            context.res = {
                status: 400,
                body: "Invalid URL"
            }
        }

        const response = await fetch(targetUrl, {
            headers: {
                "Access-Control-Allow-Origin": "*",
                "Access-Control-Allow-Methods": "GET, HEAD, POST, PUT, DELETE, OPTIONS",
                "Access-Control-Allow-Headers": "Content-Type",
                Referer: refererUrl || "",
                Origin: originUrl || "",
            },
        });

        let modifiedM3u8;
        if (targetUrl.includes(".m3u8")) {
            modifiedM3u8 = await response.text();
            const targetUrlTrimmed = `${encodeURIComponent(
                targetUrl.replace(/([^/]+\.m3u8)$/, "").trim()
            )}`;
            const encodedUrl = encodeURIComponent(refererUrl);
            const encodedOrigin = encodeURIComponent(originUrl);
            modifiedM3u8 = modifiedM3u8.split("\n").map((line) => {
                if (line.startsWith("#") || line.trim() == '') {
                    return line;
                }
                return `?url=${targetUrlTrimmed}${line}${originUrl ? `&origin=${encodedOrigin}` : ""
                    }${refererUrl ? `&referer=${encodedUrl}` : ""
                    }`;
            }).join("\n");
        }
        context.res = {
            status: response.status,
            statusText: response.statusText,
            body: modifiedM3u8 || response.body,
            headers: {
                "Access-Control-Allow-Origin": "*",
                "Content-Type":
                    response.headers?.get("Content-Type") ||
                    "application/vnd.apple.mpegurl",
            }
        }
    } catch (e) {
        context.res = {
            status: 500,
            body: e.message
        }
    }

};

export default httpTrigger;