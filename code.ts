/// <reference types="@figma/plugin-typings" />

figma.showUI(__html__, { width: 320, height: 300 });

// Função para carregar todas as fontes necessárias
async function loadRequiredFonts() {
  try {
    await Promise.all([
      figma.loadFontAsync({ family: "Inter", style: "Bold" }),
      figma.loadFontAsync({ family: "Inter", style: "Regular" }),
      figma.loadFontAsync({ family: "Inter", style: "Medium" }) // caso precise
    ]);
    console.log('Fontes Inter carregadas com sucesso');
  } catch (error) {
    console.error('Erro ao carregar fontes Inter:', error);
    // Fallback para Roboto se Inter não estiver disponível
    await Promise.all([
      figma.loadFontAsync({ family: "Roboto", style: "Bold" }),
      figma.loadFontAsync({ family: "Roboto", style: "Regular" })
    ]);
    console.log('Usando Roboto como fallback');
  }
}

function generateMarkdown(data: string[][], componentName: string): string {
  console.log('generateMarkdown called with:', { componentName, dataLength: data.length });
  
  let markdown = `# ${componentName}\n\n`;
  let currentCategory = '';
  let currentSubCategory = '';
  const props: string[] = [];

  const filtered = data.filter(row => row[0] && row[0].trim() === componentName.trim());
  console.log('Filtered rows for component:', filtered.length);

  if (filtered.length === 0) {
    markdown += "Nenhum dado encontrado para este componente.\n";
    return markdown;
  }

  for (const row of filtered) {
    const category = row[1] || '';
    const subCategory = row[2] || '';
    const guideline = row[3] || '';

    // Tratar Props separadamente
    if (category === '2. Props') {
      props.push(guideline);
      continue;
    }

    // Adicionar categoria se mudou
    if (category && category !== currentCategory) {
      markdown += `## ${category}\n\n`;
      currentCategory = category;
      currentSubCategory = '';
    }

    // Adicionar subcategoria se existe e mudou
    if (subCategory && subCategory !== currentSubCategory) {
      markdown += `### ${subCategory}\n\n`;
      currentSubCategory = subCategory;
    }

    // Adicionar guideline
    if (guideline) {
      markdown += `- ${guideline}\n`;
    }
  }

  // Adicionar props no final se existirem
  if (props.length) {
    markdown += `\n## Props\n\n`;
    props.forEach(p => markdown += `${p}\n`);
  }

  return markdown;
}

async function renderMarkdownAsText(markdown: string, parentFrame: FrameNode) {
  try {
    const text = figma.createText();
    
    // NÃO carregue a fonte aqui - já foi carregada no início
    
    // Limitar e limpar texto
    let cleanMarkdown = markdown
      .replace(/[^\x00-\x7F]/g, '')
      .substring(0, 5000);
    
    if (!cleanMarkdown.trim()) {
      cleanMarkdown = `Nenhum conteúdo encontrado para este componente.`;
    }
    
    console.log('Clean markdown length:', cleanMarkdown.length);
    console.log('Clean markdown preview:', cleanMarkdown.substring(0, 200));
    
    text.characters = cleanMarkdown;
    text.fontSize = 14;
    text.fills = [{ type: 'SOLID', color: { r: 0, g: 0, b: 0 } }];
    text.resize(700, text.height);
    text.textAutoResize = 'HEIGHT';
    
    parentFrame.appendChild(text);
  } catch (error) {
    console.error('Erro ao renderizar texto:', error);
  }
}

figma.ui.onmessage = async (msg) => {
  if (msg.type === 'create-doc') {
    const { component, data } = msg;
    
    console.log('Component:', component);
    console.log('Data rows:', data.length);
    
    // CARREGUE AS FONTES PRIMEIRO
    await loadRequiredFonts();
    
    const markdown = generateMarkdown(data, component);
    console.log('Generated markdown:', markdown);

    // Criar o frame
    const frame = figma.createFrame();
    frame.name = `UI Docs: ${component}`;
    frame.resize(800, 1600);
    frame.layoutMode = 'VERTICAL';
    frame.counterAxisSizingMode = 'AUTO';
    frame.primaryAxisSizingMode = 'AUTO';
    frame.itemSpacing = 32;
    frame.paddingLeft = frame.paddingRight = 48;
    frame.paddingTop = frame.paddingBottom = 48;

    try {
      // Criar título (fonte já carregada)
      const title = figma.createText();
      title.characters = "UI Guidelines";
      title.fontSize = 48;
      title.fills = [{ type: 'SOLID', color: { r: 0, g: 0, b: 0 } }];
      frame.appendChild(title);

      // Criar subtítulo (fonte já carregada)
      const subtitle = figma.createText();
      subtitle.characters = component;
      subtitle.fontSize = 24;
      subtitle.fills = [{ type: 'SOLID', color: { r: 0.2, g: 0.2, b: 0.2 } }];
      frame.appendChild(subtitle);

      // Renderizar o markdown (fonte já carregada)
      await renderMarkdownAsText(markdown, frame);

      // Adicionar à página e focar
      figma.currentPage.appendChild(frame);
      figma.viewport.scrollAndZoomIntoView([frame]);
      
    } catch (error) {
      console.error('Erro ao criar frame:', error);
    }
  }
};
