/// <reference types="@figma/plugin-typings" />

figma.showUI(__html__, { width: 320, height: 300 });

async function loadRequiredFonts() {
  try {
    await Promise.all([
      figma.loadFontAsync({ family: "Oatmeal Pro 2", style: "Bold" }),
      figma.loadFontAsync({ family: "Oatmeal Pro 2", style: "Regular" }),
      figma.loadFontAsync({ family: "Oatmeal Pro 2", style: "SemiBold" }),
      figma.loadFontAsync({ family: "Roboto Mono", style: "Regular" })
    ]);
    console.log('✅ Fontes Oatmeal Pro 2 e Roboto Mono carregadas com sucesso');
  } catch (error) {
    console.error('❌ Erro ao carregar Oatmeal Pro 2:', error);
    throw error;
  }
}

// Função para organizar dados por categoria e subcategoria
function organizeDataByCategory(data: string[][], componentName: string) {
  const filtered = data.filter(row => row[0] && row[0].trim() === componentName.trim());
  
  const organized: { [category: string]: { [subCategory: string]: string[] } } = {};
  
  for (const row of filtered) {
    const category = row[1] || '';
    const subCategory = row[2] || 'Main Content';
    const guideline = row[3] || '';

    if (!category) continue;
    
    if (!organized[category]) {
      organized[category] = {};
    }
    
    if (!organized[category][subCategory]) {
      organized[category][subCategory] = [];
    }
    
    if (guideline) {
      organized[category][subCategory].push(guideline);
    }
  }
  
  console.log('Organized data:', organized);
  return organized;
}

// Função para criar linha divisória (Divider) com cor #E4E4E8 e altura customizável
function createDividerLine(height: number = 2): FrameNode {
  const line = figma.createFrame();
  line.name = "Divider";
  line.resize(100, height);
  line.fills = [{ type: 'SOLID', color: { r: 0.894, g: 0.894, b: 0.909 } }]; // #E4E4E8
  return line;
}

// Função para criar texto (CORRIGIDA - com line-height e letter spacing)
async function createSimpleText(content: string, fontSize: number, fontStyle: string, isBulletPoint: boolean = false): Promise<TextNode> {
  const textNode = figma.createText();
  
  // ✅ PRIMEIRO: Definir fonte ANTES de characters
  let oatmealStyle = fontStyle;
  if (fontStyle === "Medium") {
    oatmealStyle = "SemiBold"; // Medium -> SemiBold
  }
  
  // ✅ GARANTIR que só use estilos válidos
  const validStyles = ["Bold", "Regular", "SemiBold"];
  if (!validStyles.includes(oatmealStyle)) {
    console.warn(`Estilo ${oatmealStyle} não encontrado, usando Regular`);
    oatmealStyle = "Regular";
  }
  
  textNode.fontName = { family: "Oatmeal Pro 2", style: oatmealStyle as any };
  
  // ✅ SEGUNDO: Processar conteúdo
  let cleanContent = content.replace(/\*\*(.*?)\*\*/g, '$1'); // Remove **bold**
  cleanContent = cleanContent.replace(/`(.*?)`/g, '$1'); // Remove `code`
  
  if (isBulletPoint) {
    cleanContent = cleanContent.replace(/^• /, '');
  }
  
  textNode.characters = cleanContent;
  textNode.fontSize = fontSize;
  textNode.fills = [{ type: 'SOLID', color: { r: 0, g: 0, b: 0 } }];
  textNode.textAutoResize = 'HEIGHT';
  
  // ✅ CONFIGURAÇÕES DE TIPOGRAFIA
  textNode.lineHeight = { value: 130, unit: 'PERCENT' }; // 130% line-height para todos os textos
  
  // ✅ Letter spacing -2% apenas para títulos (Bold e SemiBold)
  if (oatmealStyle === "Bold" || oatmealStyle === "SemiBold") {
    textNode.letterSpacing = { value: -2, unit: 'PERCENT' }; // -2% letter spacing para títulos
  }
  
  // Aplicar bullet list nativo do Figma
  if (isBulletPoint) {
    textNode.setRangeListOptions(0, textNode.characters.length, { type: 'UNORDERED' });
  }
  
  // ✅ Processar formatações markdown
  const formatRanges: Array<{
    start: number;
    end: number;
    type: 'bold' | 'code';
    text: string;
  }> = [];
  
  // Encontrar formatações BOLD
  const boldRegex = /\*\*(.*?)\*\*/g;
  let match;
  
  boldRegex.lastIndex = 0;
  while ((match = boldRegex.exec(content)) !== null) {
    formatRanges.push({
      start: match.index,
      end: match.index + match[0].length,
      type: 'bold',
      text: match[1]
    });
  }
  
  // Encontrar formatações CODE
  const codeRegex = /`(.*?)`/g;
  
  codeRegex.lastIndex = 0;
  while ((match = codeRegex.exec(content)) !== null) {
    formatRanges.push({
      start: match.index,
      end: match.index + match[0].length,
      type: 'code',
      text: match[1]
    });
  }
  
  // Ordenar por posição
  formatRanges.sort((a, b) => a.start - b.start);
  
  // Aplicar formatações
  let offset = 0;
  
  for (const range of formatRanges) {
    const cleanStart = range.start - offset;
    const cleanEnd = cleanStart + range.text.length;
    
    try {
      if (range.type === 'bold') {
        textNode.setRangeFontName(cleanStart, cleanEnd, { family: "Oatmeal Pro 2", style: "Bold" });
        offset += 4;
      } else if (range.type === 'code') {
        textNode.setRangeFontName(cleanStart, cleanEnd, { family: "Roboto Mono", style: "Regular" });
        textNode.setRangeFills(cleanStart, cleanEnd, [{ 
          type: 'SOLID', 
          color: { r: 0.8, g: 0.2, b: 0.6 }
        }]);
        offset += 2;
      }
    } catch (error) {
      console.warn(`Erro ao aplicar formatação ${range.type}:`, error);
      
      // Fallback para code
      if (range.type === 'code') {
        try {
          textNode.setRangeFontName(cleanStart, cleanEnd, { family: "Oatmeal Pro 2", style: "Regular" });
          textNode.setRangeFills(cleanStart, cleanEnd, [{ 
            type: 'SOLID', 
            color: { r: 0.8, g: 0.2, b: 0.6 }
          }]);
        } catch (fallbackError) {
          console.warn('Erro no fallback de código:', fallbackError);
        }
      }
    }
  }
  
  return textNode;
}

// Função para criar Props Table refinada (CORRIGIDA - layoutSizing após appendChild)
async function createPropsTable(rows: string[][], title: string): Promise<FrameNode> {
  const containerFrame = figma.createFrame();
  containerFrame.name = `Props Container: ${title}`;
  containerFrame.layoutMode = 'VERTICAL';
  containerFrame.counterAxisSizingMode = 'AUTO';
  containerFrame.itemSpacing = 36;
  containerFrame.fills = [];

  // ✅ REMOVIDO: Frame "Title & Divider" - agora apenas título direto com Bold
  const titleText = await createSimpleText(title, 28, "Bold");
  containerFrame.appendChild(titleText);
  titleText.layoutSizingHorizontal = 'FILL'; // ✅ APÓS appendChild

  // Tabela sem borda externa
  const tableFrame = figma.createFrame();
  tableFrame.name = `Props Table: ${title}`;
  tableFrame.layoutMode = 'VERTICAL';
  tableFrame.counterAxisSizingMode = 'AUTO';
  tableFrame.itemSpacing = 0;
  tableFrame.fills = [{ type: 'SOLID', color: { r: 1, g: 1, b: 1 } }];
  tableFrame.cornerRadius = 0;

  // Headers fixos
  const predefinedHeaders = ["Prop Name", "Type", "Default", "Description"];

  // Header Table refinado
  const headerRow = figma.createFrame();
  headerRow.name = "Header Table";
  headerRow.layoutMode = 'HORIZONTAL';
  headerRow.counterAxisSizingMode = 'AUTO';
  headerRow.itemSpacing = 24;
  headerRow.fills = [];
  headerRow.paddingLeft = 0;
  headerRow.paddingRight = 0;
  headerRow.paddingTop = 24;
  headerRow.paddingBottom = 24;

  for (let i = 0; i < predefinedHeaders.length; i++) {
    const header = predefinedHeaders[i];
    const cellText = await createSimpleText(header, 18, "Bold");
    headerRow.appendChild(cellText);
    if (header === "Description") {
      cellText.resize(310, cellText.height);
      cellText.layoutSizingHorizontal = 'FIXED'; // ✅ APÓS appendChild
    } else {
      cellText.layoutSizingHorizontal = 'FILL'; // ✅ APÓS appendChild
    }
  }

  // Stroke bottom 2px no Header Table (INSIDE)
  headerRow.strokes = [{ type: 'SOLID', color: { r: 0.894, g: 0.894, b: 0.909 } }];
  headerRow.strokeWeight = 2;
  headerRow.strokeAlign = 'INSIDE';
  headerRow.strokeTopWeight = 0;
  headerRow.strokeRightWeight = 0;
  headerRow.strokeLeftWeight = 0;
  headerRow.strokeBottomWeight = 2;

  tableFrame.appendChild(headerRow);
  headerRow.layoutSizingHorizontal = 'FILL'; // ✅ APÓS appendChild

  // Linhas da tabela com stroke bottom
  for (let i = 0; i < rows.length; i++) {
    if (rows[i].join('|').includes('Prop Name | Type | Default Value | Description')) continue;

    const rowFrame = figma.createFrame();
    rowFrame.name = `Table Row ${i + 1}`;
    rowFrame.layoutMode = 'HORIZONTAL';
    rowFrame.counterAxisSizingMode = 'AUTO';
    rowFrame.itemSpacing = 24;
    rowFrame.fills = [{ type: 'SOLID', color: { r: 1, g: 1, b: 1 } }];
    rowFrame.paddingLeft = 0;
    rowFrame.paddingRight = 0;
    rowFrame.paddingTop = 24;    
    rowFrame.paddingBottom = 24;

    // Stroke bottom 1px (exceto última row) - INSIDE
    const isLastRow = i === rows.length - 1;
    if (!isLastRow) {
      rowFrame.strokes = [{ type: 'SOLID', color: { r: 0.894, g: 0.894, b: 0.909 } }];
      rowFrame.strokeWeight = 1;
      rowFrame.strokeAlign = 'INSIDE';
      rowFrame.strokeTopWeight = 0;
      rowFrame.strokeRightWeight = 0;
      rowFrame.strokeLeftWeight = 0;
      rowFrame.strokeBottomWeight = 1;
    }

    for (let j = 0; j < rows[i].length; j++) {
      const cell = rows[i][j];
      const fontStyle = j === 0 ? "Bold" : "Regular";
      const cellText = await createSimpleText(cell.trim(), 18, fontStyle);
      rowFrame.appendChild(cellText);
      if (j === 3) {
        cellText.resize(310, cellText.height);
        cellText.layoutSizingHorizontal = 'FIXED'; // ✅ APÓS appendChild
      } else {
        cellText.layoutSizingHorizontal = 'FILL'; // ✅ APÓS appendChild
      }
    }
    tableFrame.appendChild(rowFrame);
    rowFrame.layoutSizingHorizontal = 'FILL'; // ✅ APÓS appendChild
  }

  containerFrame.appendChild(tableFrame);
  tableFrame.layoutSizingHorizontal = 'FILL'; // ✅ APÓS appendChild

  return containerFrame;
}

// Função principal para criar o layout estruturado (CORRIGIDA - Image à direita primeiro e estrutura Content separada)
async function createStructuredDocumentation(data: string[][], componentName: string, mainFrame: FrameNode) {
  const organizedData = organizeDataByCategory(data, componentName);
  
  let categoryIndex = 0;
  
  for (const [categoryName, subCategories] of Object.entries(organizedData)) {
    // Criar frame da categoria
    const categoryFrame = figma.createFrame();
    categoryFrame.name = categoryName;
    categoryFrame.fills = [];
    categoryFrame.layoutMode = 'VERTICAL';
    categoryFrame.counterAxisSizingMode = 'AUTO';
    categoryFrame.itemSpacing = 60; // ✅ 60px entre Title & Divider e SubCategories
    
    // ✅ Frame "Title & Divider" para CADA CATEGORY
    const categoryTitleDividerFrame = figma.createFrame();
    categoryTitleDividerFrame.name = "Title & Divider";
    categoryTitleDividerFrame.layoutMode = 'VERTICAL';
    categoryTitleDividerFrame.counterAxisSizingMode = 'AUTO';
    categoryTitleDividerFrame.itemSpacing = 24;
    categoryTitleDividerFrame.fills = [];

    // ✅ Título da categoria com 36px e BOLD
    const categoryTitle = await createSimpleText(categoryName, 36, "Bold");
    categoryTitleDividerFrame.appendChild(categoryTitle);
    categoryTitle.layoutSizingHorizontal = 'FILL'; // ✅ APÓS appendChild

    // ✅ Divider após título da categoria
    const categoryTitleDivider = createDividerLine(2);
    categoryTitleDividerFrame.appendChild(categoryTitleDivider);
    categoryTitleDivider.layoutSizingHorizontal = 'FILL'; // ✅ APÓS appendChild

    categoryFrame.appendChild(categoryTitleDividerFrame);
    categoryTitleDividerFrame.layoutSizingHorizontal = 'FILL'; // ✅ APÓS appendChild
    
    // ✅ VERIFICAR SE É A CATEGORIA "3.Anatomy" PARA TRATAMENTO ESPECIAL
    const isAnatomyCategory = categoryName.toLowerCase().includes('anatomy');
    
    // ✅ ADICIONAR IMAGE PLACEHOLDER PARA ANATOMY ENTRE TITLE & DIVIDER E SUBCATEGORIAS
    if (isAnatomyCategory) {
      // ✅ Criar Image Placeholder específico para Anatomy
      const anatomyImagePlaceholder = createImagePlaceholder();
      categoryFrame.appendChild(anatomyImagePlaceholder);
      anatomyImagePlaceholder.layoutSizingHorizontal = 'FILL'; // ✅ APÓS appendChild
    }
    
    // ✅ VERIFICAR SE É A CATEGORIA "1. Description" PARA TRATAMENTO ESPECIAL
    const isDescriptionCategory = categoryName.toLowerCase().includes('description');
    
    // ✅ CONTAINER PARA SUBCATEGORIAS (sempre criar se houver subcategorias)
    const hasSubCategories = Object.keys(subCategories).length > 0;
    let subCategoriesContainer: FrameNode | null = null;
    
    if (hasSubCategories) {
      subCategoriesContainer = figma.createFrame();
      subCategoriesContainer.name = "SubCategories";
      subCategoriesContainer.fills = [];
      subCategoriesContainer.layoutMode = 'VERTICAL';
      subCategoriesContainer.counterAxisSizingMode = 'AUTO';
      subCategoriesContainer.itemSpacing = 96; // ✅ 96px entre subcategorias
    }
    
    // ✅ CONTADOR PARA ALTERNÂNCIA DE IMAGEM (esquerda/direita) - COMEÇAR À DIREITA
    let subCategoryIndex = 0;
    
    // Processar subcategorias
    for (const [subCategoryName, content] of Object.entries(subCategories)) {
      // ✅ VERIFICAR SE É TABELA (contém linhas com |)
      const hasTableData = content.some(item => item.includes('|'));
      
      if (hasTableData) {
        // ✅ CRIAR TABELA FORMATADA
        const tableRows = content
          .filter(item => item.includes('|'))
          .map(item => item.split('|').map(cell => cell.trim()));
        
        const propsTable = await createPropsTable(tableRows, subCategoryName);
        
        if (subCategoriesContainer) {
          subCategoriesContainer.appendChild(propsTable);
          propsTable.layoutSizingHorizontal = 'FILL'; // ✅ APÓS appendChild
        }
      } else {
        // ✅ CRIAR SUBCATEGORIA NORMAL
        const subCategoryFrame = figma.createFrame();
        subCategoryFrame.name = `SubCategory: ${subCategoryName}`;
        subCategoryFrame.fills = [];
        subCategoryFrame.layoutMode = 'VERTICAL';
        subCategoryFrame.counterAxisSizingMode = 'AUTO';
        subCategoryFrame.itemSpacing = 12;
        
        // ✅ DETERMINAR SE DEVE TER IMAGE PLACEHOLDER E SUA POSIÇÃO
        const shouldAddImage = !isAnatomyCategory && !isDescriptionCategory;
        const imageOnLeft = subCategoryIndex % 2 === 1; // ✅ INVERTIDO: Ímpar = esquerda, Par = direita (COMEÇAR À DIREITA)
        
        if (shouldAddImage) {
          // ✅ CRIAR FRAME HORIZONTAL PARA CONTENT + IMAGE PLACEHOLDER
          const contentImageFrame = figma.createFrame();
          contentImageFrame.name = "Content & Image";
          contentImageFrame.fills = [];
          contentImageFrame.layoutMode = 'HORIZONTAL';
          contentImageFrame.counterAxisSizingMode = 'AUTO';
          contentImageFrame.itemSpacing = 108; // ✅ 108px entre content e image
          contentImageFrame.primaryAxisAlignItems = 'MIN'; // Alinhar ao topo
          
          // ✅ CONTAINER PARA O CONTEÚDO (título + conteúdo juntos)
          const contentContainer = figma.createFrame();
          contentContainer.name = "Content";
          contentContainer.fills = [];
          contentContainer.layoutMode = 'VERTICAL';
          contentContainer.counterAxisSizingMode = 'AUTO';
          contentContainer.itemSpacing = 24; // ✅ 24px (não 12px)
          
          // ✅ CATEGORIA DESCRIPTION: NÃO TEM TÍTULO DE SUBCATEGORIA
          if (!isDescriptionCategory) {
            // ✅ Título da subcategoria com 28px e BOLD (dentro do Content)
            const subCategoryTitle = await createSimpleText(subCategoryName, 28, "Bold");
            contentContainer.appendChild(subCategoryTitle);
            subCategoryTitle.layoutSizingHorizontal = 'FILL'; // ✅ APÓS appendChild
          }
          
          // ✅ IMAGE PLACEHOLDER (frame separado)
          const imagePlaceholder = createImagePlaceholder();
          
          // ✅ ALTERNAR POSIÇÃO: ESQUERDA OU DIREITA
          if (imageOnLeft) {
            // Image à esquerda, content à direita
            contentImageFrame.appendChild(imagePlaceholder);
            contentImageFrame.appendChild(contentContainer);
          } else {
            // Content à esquerda, image à direita
            contentImageFrame.appendChild(contentContainer);
            contentImageFrame.appendChild(imagePlaceholder);
          }
          
          // ✅ CONFIGURAR SIZING APÓS appendChild
          contentContainer.layoutSizingHorizontal = 'FILL'; // ✅ APÓS appendChild
          
          // Adicionar conteúdo ao container Content
          for (const item of content) {
            if (item.trim() && !item.includes('Image')) {
              let contentFontSize = 22;
              if (isDescriptionCategory) {
                contentFontSize = 30;
              }
              
              const shouldHaveBullet = !isDescriptionCategory;
              
              const contentText = await createSimpleText(item, contentFontSize, "Regular", shouldHaveBullet);
              contentContainer.appendChild(contentText);
              contentText.layoutSizingHorizontal = 'FILL';
            }
          }
          
          subCategoryFrame.appendChild(contentImageFrame);
          contentImageFrame.layoutSizingHorizontal = 'FILL'; // ✅ APÓS appendChild
          
        } else {
          // ✅ SEM IMAGE PLACEHOLDER (Description ou Anatomy)
          
          // ✅ CATEGORIA DESCRIPTION: NÃO TEM TÍTULO DE SUBCATEGORIA
          if (!isDescriptionCategory) {
            // ✅ Título da subcategoria com 28px e BOLD
            const subCategoryTitle = await createSimpleText(subCategoryName, 28, "Bold");
            subCategoryFrame.appendChild(subCategoryTitle);
            subCategoryTitle.layoutSizingHorizontal = 'FILL'; // ✅ APÓS appendChild
          }
          
          for (const item of content) {
            if (item.trim() && !item.includes('Image')) {
              // ✅ Tamanho da fonte especial para Description Category
              let contentFontSize = 22; // ✅ Padrão: 22px
              if (isDescriptionCategory) {
                contentFontSize = 30; // ✅ Description: 30px
              }
              
              // ✅ CATEGORIA DESCRIPTION: SEM BULLET POINT
              const shouldHaveBullet = !isDescriptionCategory; // ✅ Description = sem bullet
              
              const contentText = await createSimpleText(item, contentFontSize, "Regular", shouldHaveBullet);
              subCategoryFrame.appendChild(contentText);
              contentText.layoutSizingHorizontal = 'FILL'; // ✅ APÓS appendChild
            }
          }
        }
        
        if (subCategoriesContainer) {
          subCategoriesContainer.appendChild(subCategoryFrame);
          subCategoryFrame.layoutSizingHorizontal = 'FILL'; // ✅ APÓS appendChild
        }
        
        subCategoryIndex++; // ✅ Incrementar para alternância
      }
    }
    
    // ✅ ADICIONAR CONTAINER DE SUBCATEGORIAS À CATEGORIA (se existir)
    if (subCategoriesContainer && hasSubCategories) {
      categoryFrame.appendChild(subCategoriesContainer);
      subCategoriesContainer.layoutSizingHorizontal = 'FILL'; // ✅ APÓS appendChild
    }
    
    // Adicionar à página principal
    mainFrame.appendChild(categoryFrame);
    categoryFrame.layoutSizingHorizontal = 'FILL'; // ✅ APÓS appendChild
    
    categoryIndex++;
  }
}

// Função para criar placeholder de imagem (CORRIGIDA - melhor centralização)
function createImagePlaceholder(): FrameNode {
  const placeholder = figma.createFrame();
  placeholder.name = "Image Placeholder";
  placeholder.resize(330, 435);
  placeholder.fills = [{ type: 'SOLID', color: { r: 1, g: 1, b: 1 } }];
  placeholder.strokeWeight = 6;
  placeholder.strokeAlign = 'INSIDE';
  placeholder.strokes = [{ type: 'SOLID', color: { r: 0.894, g: 0.894, b: 0.909 } }];
  placeholder.cornerRadius = 32;
  
  const text = figma.createText();
  text.fontName = { family: "Oatmeal Pro 2", style: "Regular" };
  text.characters = "Image";
  text.fontSize = 21;
  text.fills = [{ type: 'SOLID', color: { r: 0.5, g: 0.5, b: 0.5 } }];
  text.textAlignHorizontal = 'CENTER';
  text.textAlignVertical = 'CENTER';
  text.lineHeight = { value: 130, unit: 'PERCENT' };
  
  placeholder.appendChild(text);
  
  // ✅ MELHOR CENTRALIZAÇÃO: Usar resize para ocupar todo o espaço e depois centralizar
  text.resize(placeholder.width, text.height);
  text.x = 0;
  text.y = (placeholder.height - text.height) / 2;
  
  text.constraints = {
    horizontal: 'CENTER',
    vertical: 'CENTER'
  };
  
  return placeholder;
}

figma.ui.onmessage = async (msg) => {
  if (msg.type === 'create-doc') {
    const { component, data } = msg;
    
    console.log('Component:', component);
    console.log('Data rows:', data.length);

    try {
      // CARREGUE AS FONTES PRIMEIRO
      await loadRequiredFonts();

      // Criar o frame principal com largura fixa escalada
      const mainFrame = figma.createFrame();
      mainFrame.name = `UI Docs: ${component}`;
      mainFrame.resize(1115, 150);
      mainFrame.layoutMode = 'VERTICAL';
      mainFrame.counterAxisSizingMode = 'AUTO';
      mainFrame.itemSpacing = 108;
      mainFrame.paddingLeft = 72;
      mainFrame.paddingRight = 72;
      mainFrame.paddingTop = 108;
      mainFrame.paddingBottom = 108;
      mainFrame.fills = [{ type: 'SOLID', color: { r: 1, g: 1, b: 1 } }];
      mainFrame.cornerRadius = 40;

      // ✅ Criar cabeçalho COM largura fixa de 916px
      const headerFrame = figma.createFrame();
      headerFrame.name = "Header";
      headerFrame.fills = [];
      headerFrame.resize(916, 100); // ✅ 916px largura fixa
      
      // Título principal
      const title = await createSimpleText("UI Guidelines", 72, "Bold");
      title.x = 0;
      title.y = 0;
      headerFrame.appendChild(title);

      // Subtítulo com nome do componente
      const subtitle = await createSimpleText(component, 48, "SemiBold");
      subtitle.fills = [{ type: 'SOLID', color: { r: 0.2, g: 0.2, b: 0.2 } }];
      subtitle.x = 0;
      subtitle.y = title.height + 24;
      headerFrame.appendChild(subtitle);

      // Ajustar apenas a altura para encaixar o conteúdo, mantendo largura fixa
      const finalHeight = title.height + 24 + subtitle.height;
      headerFrame.resize(916, finalHeight); // ✅ Manter 916px largura

      mainFrame.appendChild(headerFrame);
      headerFrame.layoutSizingHorizontal = 'FIXED'; // ✅ Largura fixa

      // Criar documentação estruturada
      await createStructuredDocumentation(data, component, mainFrame);

      // Adicionar à página e focar
      figma.currentPage.appendChild(mainFrame);
      figma.viewport.scrollAndZoomIntoView([mainFrame]);
      
    } catch (error) {
      console.error('❌ Erro ao criar frame:', error);
      
      if (error instanceof Error && error.message.includes('Oatmeal Pro 2')) {
        figma.notify('❌ Fonte "Oatmeal Pro 2" não encontrada. Verifique se está instalada.', { error: true });
      } else {
        figma.notify('❌ Erro ao criar documentação. Verifique o console.', { error: true });
      }
    }
  }
};
