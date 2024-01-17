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

    const newBoard = !document.querySelectorAll('.work-item-form-main').length;
    if (newBoard) {
      iterateItemsNew(mutation, token);
      iterateRelatedNew(mutation, token);
    } else {
      iterateItemsOld(mutation, token);
      iterateRelatedOld(mutation, token);
    }
  }
};

const iterateItemsNew = ({ target }, token) => {
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

const iterateItemsOld = async ({ target }, token) => {
  const items = target.querySelectorAll('.work-item-form-main');
  for (const item of items) {
    // Old UI is acting weird, sometimes mutations aren't registered...
    // This looks like it fixes it most of the time
    await new Promise((resolve) => setTimeout(resolve, 500));

    if (!elementIsNew(item, false)) {
      continue;
    }

    const itemHeader = item.querySelector('.info-text-wrapper');
    if (!itemHeader) {
      continue;
    }
    elementDone(item);

    const taskElements = itemHeader.querySelector('a').innerText.split(' ');
    const taskId = taskElements.pop();
    const taskType = taskElements.join(' ');
    const boardName = item.querySelector('[aria-label="Area Path"]').value;

    setLink(taskType, token, taskId, boardName, false, (forecastLink) => {
      itemHeader.querySelector('a').after(forecastLink);
    });
  }
};

const iterateRelatedNew = ({ target }, token) => {
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

const iterateRelatedOld = ({ target }, token) => {
  const relatedList = target.querySelectorAll('.la-artifact-data');
  for (const related of relatedList) {
    if (!elementIsNew(related)) {
      continue;
    }

    const taskType = Array.from(related.querySelector('.bowtie-icon').classList)
      .find((c) => c.startsWith('bowtie-symbol'))
      .split('-')
      .pop();

    const taskId = related.querySelector('a').href.split('/').pop();
    const boardName = related
      .closest('.work-item-form-main')
      .querySelector('[aria-label="Area Path"]').value;

    setLink(taskType, token, taskId, boardName, true, (forecastLink) => {
      related.querySelector('.la-additional-data > div').before(forecastLink);
    });
  }
};

const elementIsNew = (element, setAttribute = true) => {
  if (element.hasAttribute('data-ado-forecast')) {
    return false;
  }
  setAttribute && elementDone(element);
  return true;
};

const elementDone = (element) => element.setAttribute('data-ado-forecast', '');

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
  boardName = boardName.replace('\\', '\\\\');

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
