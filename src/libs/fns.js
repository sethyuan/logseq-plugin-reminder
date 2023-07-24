window.pushWeChat = async (key, title, markdownBody) => {
  try {
    const formData = new URLSearchParams()
    formData.append("title", title)
    formData.append("desp", markdownBody)
    const res = await fetch(`https://sctapi.ftqq.com/${key}.send`, {
      method: "POST",
      headers: {
        "content-type": "application/x-www-form-urlencoded;charset=UTF-8",
      },
      body: formData,
    })
    if (res.ok) {
      const json = await res.json()
      if (json.code !== 0) {
        console.error(json.data)
      }
    }
  } catch (err) {
    console.error(err)
  }
}

window.getBlockContent = async (block) => {
  let content = block.content
  if (!content) return content

  // Remove properties.
  content = content.replace(/\b[^:\n]+:: [^\n]+/g, "")

  return content.trim()
}
