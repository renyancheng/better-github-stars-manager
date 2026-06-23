import { createContext, useContext, useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { authStore, CONFIG_STORAGE_KEY } from '@/auth/auth-store';
import type { Locale, SyncProgress } from '@/types';

interface MessageCatalog {
  localeName: string;
  common: {
    untagged: string;
    remove: string;
    add: string;
    bulk: string;
    loading: string;
    none: string;
    close: string;
    previous: string;
    next: string;
    current: (value: string) => string;
    phase: (phase: SyncProgress['phase']) => string;
  };
  manager: {
    syncFailed: (label: string, error: string) => string;
    refreshTagsDone: (count: number) => string;
    refreshTagsFailed: (error: string) => string;
    noTokenBanner: string;
    addPat: string;
    emptyState: string;
  };
  toolbar: {
    searchPlaceholder: string;
    sortStarredAt: string;
    sortPushedAt: string;
    sortStars: string;
    sortName: string;
    toggleSortDir: string;
    syncTitle: string;
    syncButton: string;
    themeTitle: string;
    refreshTagsTitle: string;
    refreshTagsButton: string;
    gistPushTitle: string;
    gistPushButton: string;
    gistPullTitle: string;
    gistPullButton: string;
    moreTitle: string;
    shownTotal: (shown: number, total: number) => string;
    noToken: string;
    accountTitle: (username: string) => string;
    columnRepository: string;
    columnDescription: string;
    columnLanguage: string;
    columnStars: string;
    columnUpdated: string;
    columnTags: string;
  };
  activeFilters: {
    onlyUntagged: string;
    summary: (count: number) => string;
    clearOne: string;
    clearAll: string;
  };
  filterSidebar: {
    specialFilters: string;
    onlyUntaggedLabel: string;
    onlyUntaggedHint: string;
    showTombstoneLabel: string;
    showTombstoneHint: string;
    languages: (count: number) => string;
    languagesSearch: string;
    languagesSelected: (count: number) => string;
    languagesEmpty: string;
    tags: (count: number) => string;
    tagsSearch: string;
    tagsSelected: (count: number) => string;
    tagsMatchAny: string;
    tagsMatchAll: string;
    tagsMatchHelp: string;
    noTagsPrefix: string;
    noTagsEmphasis: string;
    noTagsSuffix: string;
  };
  starRow: {
    archived: string;
    filterByTag: (tag: string) => string;
    clearTagFilter: (tag: string) => string;
    moreHidden: (count: number) => string;
    hasNotes: string;
    noNotes: string;
  };
  repoDetail: {
    previousTitle: string;
    nextTitle: string;
    closeTitle: string;
    description: string;
    topics: (count: number) => string;
    filterTopic: string;
    suggestedTags: string;
    acceptAll: string;
    acceptAllTitle: string;
    tags: (count: number) => string;
    notes: string;
    notesPlaceholder: string;
    notesSaved: string;
    notesUnsaved: string;
    language: string;
    stars: string;
    updated: string;
    starred: string;
  };
  tagEditor: {
    noTags: string;
    filterByTag: (tag: string) => string;
    clearTagFilter: (tag: string) => string;
    removeTag: string;
    addTagPlaceholder: string;
    addTagButton: string;
    bulkEditTitle: string;
    bulkPlaceholder: string;
  };
  popup: {
    title: string;
    noToken: string;
    addPat: string;
    idle: string;
    syncIncremental: string;
    syncFull: string;
    reconcile: string;
    gistPull: string;
    gistPush: string;
    testConnection: string;
    debugState: string;
    openStars: string;
    options: string;
    testing: string;
    rate: (remaining: string | null, limit: string | null) => string;
    scopes: (scopes: string | null) => string;
    itemsOnPage: (count: number) => string;
    sample: (sample: string | null) => string;
    connectionOk: string;
    connectionNoContent: string;
    connectionRejected: string;
    connectionForbidden: string;
    failed: (label: string, error: string) => string;
  };
  options: {
    title: string;
    tokenHeading: string;
    tokenIntroPrefix: string;
    tokenLinkLabel: string;
    tokenIntroSuffix: string;
    tokenPublicRepos: string;
    tokenGists: string;
    tokenGistNote: string;
    authenticatedAs: (username: string) => string;
    removeToken: string;
    cachedAccountWarning: (username: string) => string;
    clearCachedAuth: string;
    saveVerify: string;
    verifying: string;
    tokenVerified: (username: string) => string;
    tokenRemoved: string;
    languageHeading: string;
    languageBody: string;
    languageLabel: string;
    appearanceHeading: string;
    appearanceBody: string;
    switchToLight: string;
    switchToDark: string;
    gistHeading: string;
    gistBoundPrefix: string;
    gistBoundSuffix: string;
    gistEmpty: string;
  };
  repoChip: {
    untagged: string;
    filterByTag: (tag: string) => string;
    editTags: string;
  };
  background: {
    noToken: string;
    incrementalSyncing: string;
    incrementalDone: (added: number, autoTagged: number) => string;
    fullDone: (autoTagged: number) => string;
    rescanDone: (autoTagged: number) => string;
    refreshTagsDone: (tagged: number) => string;
    fetchingPages: (total: number) => string;
    syncedRepos: (count: number) => string;
    rescanningPages: (total: number) => string;
    pushingTags: string;
    pullingTags: string;
    gistPushDone: (count: number) => string;
    gistPushNoChanges: string;
    gistPullDone: (merged: number, total: number) => string;
  };
}

const messages: Record<Locale, MessageCatalog> = {
  en: {
    localeName: 'English',
    common: {
      untagged: 'Untagged',
      remove: 'Remove',
      add: 'Add',
      bulk: 'Bulk',
      loading: 'Loading…',
      none: '—',
      close: 'Close',
      previous: 'Previous',
      next: 'Next',
      current: (value) => `Current: ${value}`,
      phase: (phase) =>
        ({ idle: 'Idle', full: 'Full', incremental: 'Incremental', rescan: 'Rescan', gist: 'Gist' }[phase]),
    },
    manager: {
      syncFailed: (label, error) => `${label}: ${error}`,
      refreshTagsDone: (count) => `Refreshed tags from language/topics for ${count} repos`,
      refreshTagsFailed: (error) => `refresh tags: ${error}`,
      noTokenBanner: 'No GitHub token configured — data cannot load.',
      addPat: 'Open options and add a PAT',
      emptyState: 'No results. Adjust filters, or click Sync in the toolbar.',
    },
    toolbar: {
      searchPlaceholder: 'Search name / description / topics   (/ to focus)',
      sortStarredAt: 'Sort by starred date',
      sortPushedAt: 'Sort by updated date',
      sortStars: 'Sort by stars',
      sortName: 'Sort by name',
      toggleSortDir: 'Toggle sort direction',
      syncTitle: 'Incrementally sync new stars',
      syncButton: 'Sync',
      themeTitle: 'Toggle black/white theme',
      refreshTagsTitle: 'Rebuild tags from language/topics locally (no network)',
      refreshTagsButton: 'Refresh tags',
      gistPushTitle: 'Push tags to Gist',
      gistPushButton: 'Push',
      gistPullTitle: 'Pull tags from Gist',
      gistPullButton: 'Pull',
      moreTitle: 'More actions',
      shownTotal: (shown, total) => `${shown} shown / ${total} total`,
      noToken: 'No token configured',
      accountTitle: (username) => `@${username} — open your stars page`,
      columnRepository: 'Repository',
      columnDescription: 'Description',
      columnLanguage: 'Lang',
      columnStars: 'Stars',
      columnUpdated: 'Updated',
      columnTags: 'Tags',
    },
    activeFilters: {
      onlyUntagged: 'Untagged only',
      summary: (count) => `${count} results · filtered`,
      clearOne: 'Remove this filter',
      clearAll: 'Clear all filters',
    },
    filterSidebar: {
      specialFilters: 'Special Filters',
      onlyUntaggedLabel: 'Untagged only',
      onlyUntaggedHint: 'only untagged',
      showTombstoneLabel: 'Show unstarred',
      showTombstoneHint: 'tombstoned repos',
      languages: (count) => `Languages${count > 0 ? ` · ${count}` : ''}`,
      languagesSearch: 'Filter languages…',
      languagesSelected: (count) => `${count} selected`,
      languagesEmpty: 'No languages match.',
      tags: (count) => `Tags (${count})`,
      tagsSearch: 'Filter tags…',
      tagsSelected: (count) => `${count} selected`,
      tagsMatchAny: 'Any',
      tagsMatchAll: 'All',
      tagsMatchHelp: 'match any / all selected tags',
      noTagsPrefix: 'No tags yet. Use toolbar',
      noTagsEmphasis: 'Refresh tags',
      noTagsSuffix: 'to generate them from language/topics.',
    },
    starRow: {
      archived: 'archived',
      filterByTag: (tag) => `Filter by "${tag}"`,
      clearTagFilter: (tag) => `Filtering by "${tag}" — click to remove`,
      moreHidden: (count) => `${count} more — see the detail panel`,
      hasNotes: 'Has notes (view in details)',
      noNotes: 'No notes',
    },
    repoDetail: {
      previousTitle: 'Previous ([)',
      nextTitle: 'Next (])',
      closeTitle: 'Close (Esc)',
      description: 'Description',
      topics: (count) => `Topics (${count})`,
      filterTopic: 'Filter by this topic',
      suggestedTags: 'Suggested tags',
      acceptAll: '+ Accept all',
      acceptAllTitle: 'Add all suggested tags',
      tags: (count) => `Tags (${count})`,
      notes: 'Notes',
      notesPlaceholder: 'Why did you star this repo?',
      notesSaved: 'Saved',
      notesUnsaved: 'Unsaved (saved on blur)',
      language: 'Language',
      stars: 'Stars',
      updated: 'Updated',
      starred: 'Starred',
    },
    tagEditor: {
      noTags: 'No tags yet',
      filterByTag: (tag) => `Filter by "${tag}"`,
      clearTagFilter: (tag) => `Filtering by "${tag}" — click to remove`,
      removeTag: 'Remove tag',
      addTagPlaceholder: 'Add a tag, press Enter to confirm',
      addTagButton: 'Add',
      bulkEditTitle: 'Bulk edit (comma-separated)',
      bulkPlaceholder: 'tag1, tag2, …',
    },
    popup: {
      title: 'Better GitHub Stars Manager',
      noToken: 'No token configured.',
      addPat: 'Add PAT',
      idle: 'Idle',
      syncIncremental: 'Sync new stars (incremental)',
      syncFull: 'Full re-pull all stars',
      reconcile: 'Reconcile stars',
      gistPull: 'Pull tags from Gist',
      gistPush: 'Push tags to Gist',
      testConnection: 'Test GitHub connection',
      debugState: 'Debug extension state',
      openStars: 'Open my stars page',
      options: 'Options…',
      testing: 'testing…',
      rate: (remaining, limit) => `rate: ${remaining}/${limit} remaining`,
      scopes: (scopes) => `scopes: ${scopes ?? '(fine-grained: none shown)'}`,
      itemsOnPage: (count) => `items on page 1: ${count}`,
      sample: (sample) => `sample: ${sample ?? '—'}`,
      connectionOk: 'OK — connection works',
      connectionNoContent: '204 No Content — token may lack /user/starred access',
      connectionRejected: '401 — token rejected',
      connectionForbidden: '403 — forbidden (check scopes / repository access)',
      failed: (label, error) => `${label} failed: ${error}`,
    },
    options: {
      title: 'Better GitHub Stars Manager — Options',
      tokenHeading: '1. GitHub Token',
      tokenIntroPrefix: 'Create a fine-grained PAT at',
      tokenLinkLabel: 'github.com/settings/tokens',
      tokenIntroSuffix: 'Required permissions:',
      tokenPublicRepos: 'Account · Public Repositories (read starred repos via /user/starred)',
      tokenGists: 'Account · Gists (read/write, for cross-device tag sync)',
      tokenGistNote: 'Note: GitHub Gist scope is account-wide (no per-gist isolation for fine-grained tokens). We create one dedicated secret gist for sync.',
      authenticatedAs: (username) => `Authenticated as @${username}.`,
      removeToken: 'Remove token',
      cachedAccountWarning: (username) => `Cached account @${username} exists, but the token is not usable in this extension instance.`,
      clearCachedAuth: 'Clear cached auth',
      saveVerify: 'Save & verify',
      verifying: 'Verifying…',
      tokenVerified: (username) => `Token verified. Logged in as ${username}.`,
      tokenRemoved: 'Token removed.',
      languageHeading: '2. Language',
      languageBody: 'UI copy is localized through a lightweight extension dictionary. English is the default.',
      languageLabel: 'Language',
      appearanceHeading: '3. Appearance',
      appearanceBody: 'Black/white theme. Applies to the stars page, options, and popup.',
      switchToLight: 'Switch to light',
      switchToDark: 'Switch to dark',
      gistHeading: '4. Gist sync',
      gistBoundPrefix: 'Bound to gist',
      gistBoundSuffix: 'Tags sync to/from this gist (per-repo LWW).',
      gistEmpty: 'No gist yet. One is created automatically on your first tag push.',
    },
    repoChip: {
      untagged: 'untagged',
      filterByTag: (tag) => `Filter stars by "${tag}"`,
      editTags: 'Edit tags',
    },
    background: {
      noToken: 'No token configured',
      incrementalSyncing: 'Checking for newly starred repos…',
      incrementalDone: (added, autoTagged) => `+${added} new · ${autoTagged} auto-tagged`,
      fullDone: (autoTagged) => `Full sync done · ${autoTagged} auto-tagged`,
      rescanDone: (autoTagged) => `Rescan done · ${autoTagged} auto-tagged`,
      refreshTagsDone: (tagged) => `Refreshed · ${tagged} tagged`,
      fetchingPages: (total) => `Fetching ${total} pages…`,
      syncedRepos: (count) => `Synced ${count} repos`,
      rescanningPages: (total) => `Rescanning ${total} pages…`,
      pushingTags: 'Uploading tag snapshot to Gist…',
      pullingTags: 'Pulling tags from Gist…',
      gistPushDone: (count) => `Pushed ${count} changed tag records to Gist`,
      gistPushNoChanges: 'No local tag changes to push',
      gistPullDone: (merged, total) => `Pulled ${merged} updates from ${total} remote tag records`,
    },
  },
  'zh-CN': {
    localeName: '中文',
    common: {
      untagged: '未标注',
      remove: '移除',
      add: '添加',
      bulk: '批量',
      loading: '加载中…',
      none: '—',
      close: '关闭',
      previous: '上一个',
      next: '下一个',
      current: (value) => `当前: ${value}`,
      phase: (phase) =>
        ({ idle: '空闲', full: '全量', incremental: '增量', rescan: '重扫', gist: 'Gist' }[phase]),
    },
    manager: {
      syncFailed: (label, error) => `${label}: ${error}`,
      refreshTagsDone: (count) => `已从 language/topics 刷新 ${count} 个仓库的标签`,
      refreshTagsFailed: (error) => `刷新标签失败: ${error}`,
      noTokenBanner: '未配置 GitHub token — 无法加载数据。',
      addPat: '打开选项页并添加 PAT',
      emptyState: '无结果。调整筛选，或点击工具栏中的 Sync。',
    },
    toolbar: {
      searchPlaceholder: '搜索 名称 / 描述 / topics   (按 / 聚焦)',
      sortStarredAt: '按 star 时间',
      sortPushedAt: '按更新时间',
      sortStars: '按 star 数',
      sortName: '按名称',
      toggleSortDir: '切换排序方向',
      syncTitle: '增量同步新的 stars',
      syncButton: 'Sync',
      themeTitle: '切换黑白主题',
      refreshTagsTitle: '从 language/topics 本地重建标签（不请求网络）',
      refreshTagsButton: '刷新标签',
      gistPushTitle: '推送标签到 Gist',
      gistPushButton: 'Push',
      gistPullTitle: '从 Gist 拉取标签',
      gistPullButton: 'Pull',
      moreTitle: '更多操作',
      shownTotal: (shown, total) => `${shown} 已显示 / ${total} 总计`,
      noToken: '未配置 token',
      accountTitle: (username) => `@${username} — 打开你的 stars 页面`,
      columnRepository: '仓库',
      columnDescription: '描述',
      columnLanguage: '语言',
      columnStars: 'Stars',
      columnUpdated: '更新',
      columnTags: '标签',
    },
    activeFilters: {
      onlyUntagged: '仅未标注',
      summary: (count) => `${count} 个结果 · 已筛选`,
      clearOne: '移除该筛选',
      clearAll: '清除全部筛选',
    },
    filterSidebar: {
      specialFilters: '特殊筛选',
      onlyUntaggedLabel: '仅未标注',
      onlyUntaggedHint: 'only untagged',
      showTombstoneLabel: '显示已 unstar',
      showTombstoneHint: 'tombstoned repos',
      languages: (count) => `Languages${count > 0 ? ` · ${count}` : ''}`,
      languagesSearch: '筛选语言…',
      languagesSelected: (count) => `已选 ${count} 个`,
      languagesEmpty: '没有匹配的语言。',
      tags: (count) => `Tags (${count})`,
      tagsSearch: '筛选标签…',
      tagsSelected: (count) => `已选 ${count} 个`,
      tagsMatchAny: '任一',
      tagsMatchAll: '全部',
      tagsMatchHelp: '匹配 任一 / 全部 所选标签',
      noTagsPrefix: '暂无标签。点击工具栏',
      noTagsEmphasis: '刷新标签',
      noTagsSuffix: '从 language/topics 自动生成。',
    },
    starRow: {
      archived: '已归档',
      filterByTag: (tag) => `按 "${tag}" 筛选`,
      clearTagFilter: (tag) => `正在按 "${tag}" 筛选，点击移除`,
      moreHidden: (count) => `还有 ${count} 个，在详情中查看`,
      hasNotes: '有笔记（在详情中查看）',
      noNotes: '无笔记',
    },
    repoDetail: {
      previousTitle: '上一个 ([)',
      nextTitle: '下一个 (])',
      closeTitle: '关闭 (Esc)',
      description: '描述',
      topics: (count) => `Topics (${count})`,
      filterTopic: '按此 topic 筛选',
      suggestedTags: '建议标签',
      acceptAll: '+ 全部接受',
      acceptAllTitle: '添加所有建议标签',
      tags: (count) => `标签 (${count})`,
      notes: '笔记',
      notesPlaceholder: '为什么会 star 这个仓库？',
      notesSaved: '已保存',
      notesUnsaved: '未保存（失焦后保存）',
      language: '语言',
      stars: 'Stars',
      updated: '更新',
      starred: 'Star 时间',
    },
    tagEditor: {
      noTags: '尚无标签',
      filterByTag: (tag) => `按 "${tag}" 筛选`,
      clearTagFilter: (tag) => `正在按 "${tag}" 筛选，点击移除`,
      removeTag: '移除标签',
      addTagPlaceholder: '添加标签，按回车确认',
      addTagButton: '添加',
      bulkEditTitle: '批量编辑（逗号分隔）',
      bulkPlaceholder: 'tag1, tag2, …',
    },
    popup: {
      title: 'Better GitHub Stars Manager',
      noToken: '未配置 token。',
      addPat: '添加 PAT',
      idle: '空闲',
      syncIncremental: '同步新 stars（增量）',
      syncFull: '全量重新拉取所有 stars',
      reconcile: '校正 stars 状态',
      gistPull: '从 Gist 拉取标签',
      gistPush: '推送标签到 Gist',
      testConnection: '测试 GitHub 连接',
      debugState: '调试扩展状态',
      openStars: '打开我的 stars 页面',
      options: '选项…',
      testing: '测试中…',
      rate: (remaining, limit) => `限额: ${remaining}/${limit} 剩余`,
      scopes: (scopes) => `权限: ${scopes ?? '（细粒度 token 不显示 scope）'}`,
      itemsOnPage: (count) => `第 1 页条目数: ${count}`,
      sample: (sample) => `示例: ${sample ?? '—'}`,
      connectionOk: '正常 — 连接可用',
      connectionNoContent: '204 No Content — token 可能缺少 /user/starred 权限',
      connectionRejected: '401 — token 被拒绝',
      connectionForbidden: '403 — 无权限（检查 scopes / repo access）',
      failed: (label, error) => `${label} 失败: ${error}`,
    },
    options: {
      title: 'Better GitHub Stars Manager — 选项',
      tokenHeading: '1. GitHub Token',
      tokenIntroPrefix: '在这里创建细粒度 PAT：',
      tokenLinkLabel: 'github.com/settings/tokens',
      tokenIntroSuffix: '所需权限：',
      tokenPublicRepos: 'Account · Public Repositories（通过 /user/starred 读取 stars）',
      tokenGists: 'Account · Gists（读写，用于跨设备标签同步）',
      tokenGistNote: '注意：GitHub Gist 权限是账号级的（细粒度 token 不能按 gist 隔离）。我们会为同步创建一个专用 secret gist。',
      authenticatedAs: (username) => `已认证为 @${username}。`,
      removeToken: '移除 token',
      cachedAccountWarning: (username) => `缓存账号 @${username} 仍在，但当前扩展实例里的 token 已不可用。`,
      clearCachedAuth: '清除缓存认证',
      saveVerify: '保存并验证',
      verifying: '验证中…',
      tokenVerified: (username) => `Token 验证成功，当前登录为 ${username}。`,
      tokenRemoved: 'Token 已移除。',
      languageHeading: '2. 语言',
      languageBody: 'UI 文案现在通过轻量字典国际化管理，默认英文。',
      languageLabel: '语言',
      appearanceHeading: '3. 外观',
      appearanceBody: '黑白主题。应用于 stars 页面、选项页和 popup。',
      switchToLight: '切换到浅色',
      switchToDark: '切换到深色',
      gistHeading: '4. Gist 同步',
      gistBoundPrefix: '已绑定 gist',
      gistBoundSuffix: '标签会与该 gist 双向同步（按仓库做 LWW 合并）。',
      gistEmpty: '尚未创建 gist。首次推送标签时会自动创建。',
    },
    repoChip: {
      untagged: '未标注',
      filterByTag: (tag) => `按 "${tag}" 筛选 stars`,
      editTags: '编辑标签',
    },
    background: {
      noToken: '未配置 token',
      incrementalSyncing: '正在检查新 star 的仓库…',
      incrementalDone: (added, autoTagged) => `新增 ${added} 个 · 自动打标 ${autoTagged} 个`,
      fullDone: (autoTagged) => `全量同步完成 · 自动打标 ${autoTagged} 个`,
      rescanDone: (autoTagged) => `重扫完成 · 自动打标 ${autoTagged} 个`,
      refreshTagsDone: (tagged) => `已刷新 · 打标 ${tagged} 个`,
      fetchingPages: (total) => `正在获取 ${total} 页…`,
      syncedRepos: (count) => `已同步 ${count} 个仓库`,
      rescanningPages: (total) => `正在重扫 ${total} 页…`,
      pushingTags: '正在把标签快照上传到 Gist…',
      pullingTags: '正在从 Gist 拉取标签…',
      gistPushDone: (count) => `已向 Gist 推送 ${count} 条变更标签记录`,
      gistPushNoChanges: '没有需要推送的本地标签变更',
      gistPullDone: (merged, total) => `已从 ${total} 条远端标签记录中合并 ${merged} 条更新`,
    },
  },
};

interface I18nValue {
  locale: Locale;
  setLocale: (locale: Locale) => Promise<void>;
  m: MessageCatalog;
}

const I18nContext = createContext<I18nValue>({
  locale: 'en',
  setLocale: async () => {},
  m: messages.en,
});

export function getMessages(locale: Locale): MessageCatalog {
  return messages[locale] ?? messages.en;
}

export const messageFor = getMessages;

export function I18nProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>('en');

  useEffect(() => {
    const syncLocale = () => {
      authStore.getLocale().then((stored) => setLocaleState(stored)).catch(() => {});
    };
    const listener = (changes: Record<string, chrome.storage.StorageChange>, areaName: string) => {
      if (areaName === 'local' && changes[CONFIG_STORAGE_KEY]) syncLocale();
    };

    syncLocale();
    chrome.storage.onChanged.addListener(listener);
    return () => chrome.storage.onChanged.removeListener(listener);
  }, []);

  const setLocale = async (next: Locale) => {
    setLocaleState(next);
    await authStore.setLocale(next);
  };

  return (
    <I18nContext.Provider value={{ locale, setLocale, m: getMessages(locale) }}>
      {children}
    </I18nContext.Provider>
  );
}

export function useI18n(): I18nValue {
  return useContext(I18nContext);
}
