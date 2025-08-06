// code.ts
figma.showUI(__html__, { width: 320, height: 300 });

// 1. Busca os nomes dos componentes únicos da planilha (coluna A)
async function fetchComponentsFromSheet() {
  const csvUrl = 'https://cozy-docs-proxy.dsdocs.workers.dev';
  const res = await fetch(csvUrl);
  const csvText = await res.text();

  const lines = csvText.split('\n').slice(1);
  const componentNames = lines.map(line => line.split(',')[0].trim()).filter(name => name);
  return Array.from(new Set(componentNames));
}

// 2. Busca todas as linhas da planilha (colunas A a D)
async function fetchAllSheetRows() {
  const csvUrl = 'https://cozy-docs-proxy.dsdocs.workers.dev';
  const res = await fetch(csvUrl);
  const csvText = await res.text();
  const lines = csvText.split('\n').map(line => line.split(','));
  return lines.filter(r => r.length >= 4);
}

// 3. Gera markdown estruturado com base nas linhas do componente
function generateMarkdown(data, componentName) {
  let markdown = `# ${componentName}\n\n`;
  let currentCategory = '';
  let currentSubCategory = '';
  const props = [];

  const filtered = data.filter(row => row[0] === componentName);

  for (const row of filtered) {
    const category = row[1];
    const subCategory = row[2];
    const guideline = row[3];

    if (category === '2. Props') {
      props.push(guideline);
      continue;
    }

    if (category !== currentCategory) {
      markdown += `## ${category}\n\n`;
      currentCategory = category;
      currentSubCategory = '';
    }

    if (subCategory && subCategory !== currentSubCategory) {
      markdown += `### ${subCategory}\n\n`;
      currentSubCategory = subCategory;
    }

    markdown += `${guideline}\n\n`;
  }

  if (props.length > 0) {
    markdown += `## 2. Props\n\n`;
    markdown += `| Prop | Description |\n|------|-------------|\n`;
    props.forEach(line => {
      const [prop, desc] = line.split(':');
      const safeProp = prop ? prop.trim() : '';
      const safeDesc = desc ? desc.trim() : '';
      markdown += '| ' + safeProp + ' | ' + safeDesc + ' |\n';
    });
  }

  return markdown;
}

// 4. Cria o frame no Figma com o markdown como text node
async function createMarkdownFrame(componentName, markdown) {
  const frame = figma.createFrame();
  frame.name = `UI Docs: ${componentName}`;
  frame.resize(800, 1600);
  frame.layoutMode = 'VERTICAL';
  frame.primaryAxisSizingMode = 'AUTO';
  frame.counterAxisSizingMode = 'AUTO';
  frame.itemSpacing = 24;
  frame.paddingLeft = frame.paddingRight = 48;
  frame.paddingTop = frame.paddingBottom = 48;
  frame.fills = [];

  await figma.loadFontAsync({ family: "Inter", style: "Regular" });

  const title = figma.createText();
  title.characters = markdown;
  title.fontSize = 14;
  title.lineHeight = { value: 20, unit: 'PIXELS' };
  frame.appendChild(title);

  figma.currentPage.appendChild(frame);
  figma.viewport.scrollAndZoomIntoView([frame]);
}

// 5. Manipulador das mensagens da UI
figma.ui.onmessage = async (msg) => {
  if (msg.type === 'get-components') {
    const components = await fetchComponentsFromSheet();
    figma.ui.postMessage({ type: 'set-components', components });
  }

  if (msg.type === 'create-doc') {
    const component = msg.component;
    const data = await fetchAllSheetRows();
    const markdown = generateMarkdown(data, component);
    await createMarkdownFrame(component, markdown);
  }
};