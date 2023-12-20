const urls = new Map();

const main = async () => {
  const { token } = await import(chrome.runtime.getURL('token.js'));
  const observer = new MutationObserver((ms) => mutationCallback(ms, token));
  observer.observe(document.body, { childList: true, subtree: true });
};

const mutationCallback = (mutations, token) => {
  for (const mutation of mutations) {
    if (mutation.type !== 'childList') {
      continue;
    }

    iterateItems(mutation, token);
    iterateRelated(mutation, token);
  }
};

const iterateItems = ({ target }, token) => {
  const items = target.querySelectorAll('.work-item-form-page');
  for (const item of items) {
    if (!elementIsNew(item)) {
      continue;
    }

    const itemHeader = item.querySelector('.work-item-form-header');
    const taskElements = itemHeader.querySelector('a').innerText.split(' ');
    const taskId = taskElements.pop();
    const taskType = taskElements.join(' ');
    const boardName = item.querySelector('#__bolt--Area-input').value;

    setLink(taskType, token, taskId, boardName, false, (forecastLink) => {
      itemHeader.querySelector('.flex-row.flex-noshrink').after(forecastLink);
    });
  }
};

const iterateRelated = ({ target }, token) => {
  const relatedList = target.querySelectorAll('.artifact-link-container');
  for (const related of relatedList) {
    if (!elementIsNew(related)) {
      continue;
    }

    const taskType = related.querySelector('[role=img]').ariaLabel;
    const taskId = related.querySelector('.artifact-link-id').innerText;
    const boardName = related
      .closest('.work-item-form-page')
      .querySelector('#__bolt--Area-input').value;

    setLink(taskType, token, taskId, boardName, true, (forecastLink) => {
      related
        .querySelector('.padding-right-8.text-ellipsis')
        .before(forecastLink);
    });
  }
};

const elementIsNew = (element) => {
  if (element.hasAttribute('data-ado-forecast')) {
    return false;
  }
  element.setAttribute('data-ado-forecast', '');
  return true;
};

const setLink = (taskType, token, taskId, boardName, related, insert) => {
  if (!shouldLogTimeOnTask(taskType)) {
    return;
  }

  getForecastUrl(token, taskId, boardName).then((url) => {
    const forecastLink = createForecastLink(url, related);
    insert(forecastLink);
  }, console.log);
};

const shouldLogTimeOnTask = (taskType) =>
  ['task', 'bug'].includes(taskType.toLowerCase());

const getForecastUrl = async (token, taskId, boardName) => {
  const savedUrl = urls.get(taskId);
  if (savedUrl) {
    return savedUrl;
  }

  // Escape any backslashes in the board name
  boardName = boardName.replace('\\', '\\\\')

  const response = await fetch(
    `https://zenegy-forecast.adaptagency.com/ado-forecast?id=${taskId}&board_name=${boardName}`,
    { headers: { Authorization: `Bearer ${token}` } },
  );

  const { url } = await response.json();
  urls.set(taskId, url);
  return url;
};

const createForecastLink = (url, related) => {
  const forecastLogo = document.createElement('img');
  forecastLogo.src = chrome.runtime.getURL('forecast-logo.png');

  const forecastLink = document.createElement('a');
  forecastLink.href = url;
  forecastLink.target = '_blank';
  forecastLink.classList.add('ado-forecast', related && 'related');
  forecastLink.append(forecastLogo);

  return forecastLink;
};

main();
