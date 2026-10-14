export function createGithubClient(token, fetchImpl = fetch) {
  return async function github(endpoint, method = 'GET', body, step = '连接 GitHub') {
    const response = await fetchImpl('https://api.github.com' + endpoint, {
      method,
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28',
        'Content-Type': 'application/json',
      },
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: AbortSignal.timeout(30000),
    });
    if (!response.ok) {
      const data = await response.json().catch(() => null);
      const detail = typeof data?.message === 'string'
        ? data.message.replaceAll(token, '[已隐藏]').replace(/(?:github_pat_|gh[pousr]_)[A-Za-z0-9_]+/g, '[已隐藏]').slice(0, 250)
        : '请检查令牌所选仓库和该步骤所需权限。';
      const error = new Error(`${step}失败（GitHub ${response.status}）：${detail}`);
      error.status = response.status;
      error.step = step;
      throw error;
    }
    return response.status === 204 ? null : response.json();
  };
}

export async function verifyExistingPages(github) {
  let pages;
  try {
    pages = await github('/repos/Sun-XT9527/personal-blog/pages', 'GET', undefined, '检查博客托管');
  } catch (error) {
    if (error.status === 404) {
      throw new Error('博客托管尚未启用。请在博客仓库的 Settings → Pages 中选择 GitHub Actions，再重试连接。');
    }
    throw error;
  }
  if (pages.build_type !== 'workflow') {
    throw new Error('请在博客仓库的 Settings → Pages 中将发布来源选择为 GitHub Actions，再重试连接。');
  }
  return pages;
}
