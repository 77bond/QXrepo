/*
 * Reddit GraphQL (gql-fed.reddit.com) response rewrite
 * - 强制 isNsfw: true -> false
 * - 过滤 feed 数组中的广告/推广节点 (Promoted/Sponsored/AdPost...)
 *
 * 用法: QuantumultX [rewrite_local] script-response-body
 * repo: 77bond/QXrepo
 */

let body = $response.body;

if (body && typeof body === "string") {
  // 1. isNsfw true -> false
  body = body.replace(/"isNsfw"\s*:\s*true/g, '"isNsfw" : false');

  try {
    let obj = JSON.parse(body);

    const isAdNode = (node) => {
      if (!node || typeof node !== "object") return false;

      const typename = String(node.__typename || "");

      return (
        /Promoted|Sponsored|AdPost|AdPayload|AdMetadata|AdUnit/i.test(typename) ||
        node.isAd === true ||
        node.isSponsored === true ||
        node.isPromoted === true ||
        node.promoted === true ||
        node.adPayload != null ||
        node.adInfo != null ||
        node.adMetadata != null ||
        node.promotedBy != null ||
        node.sponsoredBy != null
      );
    };

    const clean = (value, key = "") => {
      if (Array.isArray(value)) {
        // 只在常见 feed 列表数组里删除广告，避免误删布局/元数据
        const shouldFilter = /edges|items|children|posts|elements|cells/i.test(key);

        let arr = value.map((item) => clean(item));

        if (shouldFilter) {
          arr = arr.filter((item) => {
            if (!item || typeof item !== "object") return true;

            if (isAdNode(item)) return false;
            if (isAdNode(item.node)) return false;
            if (isAdNode(item.post)) return false;
            if (isAdNode(item.item)) return false;
            if (isAdNode(item.data)) return false;

            return true;
          });
        }

        return arr;
      }

      if (value && typeof value === "object") {
        for (const k of Object.keys(value)) {
          value[k] = clean(value[k], k);
        }
      }

      return value;
    };

    obj = clean(obj);
    body = JSON.stringify(obj);
  } catch (e) {}
}

$done({ body });
