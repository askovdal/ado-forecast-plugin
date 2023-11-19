const main = async () => {
  const { token } = await import(chrome.runtime.getURL('token.js'));

  const observer = new MutationObserver((mutations) =>
    mutationCallback(mutations, token),
  );

  const body = document.querySelector('body');
  observer.observe(body, { childList: true, subtree: true });
};

const mutationCallback = (mutations, token) => {
  for (const mutation of mutations) {
    if (mutation.type !== 'childList') {
      continue;
    }

    const items = mutation.target.querySelectorAll('.work-item-form-page');
    for (const item of items) {
      if (item.hasAttribute('data-ado-forecast')) {
        continue;
      }

      item.setAttribute('data-ado-forecast', '');

      const projectName = item.querySelector('#__bolt--Area-input').value;
      const itemHeader = item.querySelector('.work-item-form-header');
      const taskElements = itemHeader.querySelector('a').innerText.split(' ');
      const taskId = taskElements.pop();
      const taskType = taskElements.join(' ');

      if (!['TASK', 'BUG'].includes(taskType)) {
        return;
      }

      getForecastUrl(token, taskId, projectName).then(
        ({ url }) => insertForecastLink(itemHeader, url),
        console.log,
      );
    }
  }
};

const getForecastUrl = async (token, taskId, projectName) => {
  const response = await fetch(
    `https://ado-forecast.onrender.com/?task_id=${taskId}&project_name=${projectName}`,
    { headers: { Authorization: `Bearer ${token}` } },
  );

  return await response.json();
};

const insertForecastLink = (itemHeader, url) => {
  const forecastLogo = document.createElement('img');
  forecastLogo.src = chrome.runtime.getURL('forecast-logo.png');

  const forecastLink = document.createElement('a');
  forecastLink.href = url;
  forecastLink.target = '_blank';
  forecastLink.classList.add('ado-forecast');
  forecastLink.append(forecastLogo);

  itemHeader.querySelector('.flex-row .flex-noshrink').after(forecastLink);
};

main();
