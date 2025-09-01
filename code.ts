/// <reference types="@figma/plugin-typings" />

figma.showUI(__html__, { width: 320, height: 300 });

async function loadRequiredFonts() {
  try {
    await Promise.all([
      figma.loadFontAsync({ family: "Inter", style: "Bold" }),
      figma.loadFontAsync({ family: "Inter", style: "Regular" }),
      figma.loadFontAsync({ family: "Inter", style: "Medium" }),
      figma.loadFontAsync({ family: "Roboto Mono", style: "Regular" }) // ✅ Para code snippets
    ]);
    console.log('Fontes Inter e Roboto Mono carregadas com sucesso');
  } catch (error) {
    console.error('Erro ao carregar fontes:', error);
    await Promise.all([
      figma.loadFontAsync({ family: "Roboto", style: "Bold" }),
      figma.loadFontAsync({ family: "Roboto", style: "Regular" }),
      figma.loadFontAsync({ family: "Roboto", style: "Medium" })
    ]);
    console.log('Usando Roboto como fallback');
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

// Função para criar linha divisória (Divider) com cor #E4E4E8 e 2px
function createDividerLine(): FrameNode {
  const line = figma.createFrame();
  line.name = "Divider";
  line.resize(100, 2); // 2px de altura
  line.fills = [{ type: 'SOLID', color: { r: 0.894, g: 0.894, b: 0.909 } }]; // #E4E4E8
  return line;
}

// Função para criar placeholder de imagem (CORRIGIDA - constraints para centralização)
function createImagePlaceholder(): FrameNode {
  const placeholder = figma.createFrame();
  placeholder.name = "Image Placeholder";
  placeholder.resize(330, 435);
  placeholder.fills = [{ type: 'SOLID', color: { r: 1, g: 1, b: 1 } }];
  placeholder.strokeWeight = 6;
  placeholder.strokeAlign = 'INSIDE';
  placeholder.strokes = [{ type: 'SOLID', color: { r: 0.894, g: 0.894, b: 0.909 } }];
  placeholder.cornerRadius = 32;
  
  // Criar o texto
  const text = figma.createText();
  text.characters = "Image";
  text.fontSize = 21;
  text.fontName = { family: "Inter", style: "Regular" };
  text.fills = [{ type: 'SOLID', color: { r: 0.5, g: 0.5, b: 0.5 } }];
  text.textAlignHorizontal = 'CENTER';
  text.textAlignVertical = 'CENTER';
  
  // ✅ PRIMEIRO: Adicionar o texto ao frame
  placeholder.appendChild(text);
  
  // ✅ SEGUNDO: Posicionar o texto no centro
  text.x = (placeholder.width - text.width) / 2;
  text.y = (placeholder.height - text.height) / 2;
  
  // ✅ TERCEIRO: Definir constraints para manter centralizado
  text.constraints = {
    horizontal: 'CENTER',  // Centralizar horizontalmente
    vertical: 'CENTER'     // Centralizar verticalmente
  };
  
  return placeholder;
}

// Função para criar texto com suporte a markdown **bold**, ``code`` e bullet list (CORRIGIDA)
async function createSimpleText(content: string, fontSize: number, fontStyle: string, isBulletPoint: boolean = false): Promise<TextNode> {
  const textNode = figma.createText();
  
  // Primeiro, remover o markdown e criar o texto limpo
  let cleanContent = content.replace(/\*\*(.*?)\*\*/g, '$1'); // Remove **bold**
  cleanContent = cleanContent.replace(/`(.*?)`/g, '$1'); // Remove `code`
  
  // Se for bullet point, não adicionar "•" - usar funcionalidade nativa do Figma
  if (isBulletPoint) {
    cleanContent = cleanContent.replace(/^• /, '');
  }
  
  textNode.characters = cleanContent;
  textNode.fontSize = fontSize;
  textNode.fontName = { family: "Inter", style: fontStyle as any };
  textNode.fills = [{ type: 'SOLID', color: { r: 0, g: 0, b: 0 } }];
  textNode.textAutoResize = 'HEIGHT';
  
  // Aplicar bullet list nativo do Figma
  if (isBulletPoint) {
    textNode.setRangeListOptions(0, textNode.characters.length, { type: 'UNORDERED' });
  }
  
  // ✅ NOVA ABORDAGEM: Processar ambos os tipos de formatação juntos
  // Criar array de formatações para aplicar na ordem correta
  const formatRanges: Array<{
    start: number;
    end: number;
    type: 'bold' | 'code';
    text: string;
  }> = [];
  
  // ✅ 1. Encontrar todas as formatações BOLD no texto original
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
  
  // ✅ 2. Encontrar todas as formatações CODE no texto original
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
  
  // ✅ 3. Ordenar por posição (do início para o fim)
  formatRanges.sort((a, b) => a.start - b.start);
  
  // ✅ 4. Aplicar formatações calculando offset acumulativo
  let offset = 0;
  
  for (const range of formatRanges) {
    // Calcular posição no texto limpo
    const cleanStart = range.start - offset;
    const cleanEnd = cleanStart + range.text.length;
    
    try {
      if (range.type === 'bold') {
        // Aplicar negrito
        textNode.setRangeFontName(cleanStart, cleanEnd, { family: "Inter", style: "Bold" });
        // Atualizar offset: **texto** = 4 caracteres removidos
        offset += 4;
      } else if (range.type === 'code') {
        // Aplicar formatação de código
        textNode.setRangeFontName(cleanStart, cleanEnd, { family: "Roboto Mono", style: "Regular" });
        textNode.setRangeFills(cleanStart, cleanEnd, [{ 
          type: 'SOLID', 
          color: { r: 0.8, g: 0.2, b: 0.6 }
        }]);
        // Atualizar offset: `texto` = 2 caracteres removidos
        offset += 2;
      }
    } catch (error) {
      console.warn(`Erro ao aplicar formatação ${range.type}:`, error);
      
      // Fallback para code
      if (range.type === 'code') {
        try {
          textNode.setRangeFontName(cleanStart, cleanEnd, { family: "Inter", style: "Regular" });
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

// Função para criar Props Table refinada
async function createPropsTable(rows: string[][], title: string): Promise<FrameNode> {
  const containerFrame = figma.createFrame();
  containerFrame.name = `Props Container: ${title}`;
  containerFrame.layoutMode = 'VERTICAL';
  containerFrame.counterAxisSizingMode = 'AUTO';
  containerFrame.itemSpacing = 36;
  containerFrame.fills = [];

  // Título da subcategoria
  const titleText = await createSimpleText(title, 28, "Bold");
  containerFrame.appendChild(titleText);
  titleText.layoutSizingHorizontal = 'FILL';

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
  headerRow.paddingLeft = 0;   // ✅ padding 0px
  headerRow.paddingRight = 0;  // ✅ padding 0px
  headerRow.paddingTop = 24;    // ✅ padding 24px
  headerRow.paddingBottom = 24; // ✅ padding 24px

  for (let i = 0; i < predefinedHeaders.length; i++) {
    const header = predefinedHeaders[i];
    const cellText = await createSimpleText(header, 18, "Bold"); // ✅ 22px -> 18px
    headerRow.appendChild(cellText);
    if (header === "Description") {
      cellText.resize(310, cellText.height);
      cellText.layoutSizingHorizontal = 'FIXED';
    } else {
      cellText.layoutSizingHorizontal = 'FILL';
    }
  }

  // Stroke bottom 2px no Header Table (INSIDE)
  headerRow.strokes = [{ type: 'SOLID', color: { r: 0.894, g: 0.894, b: 0.909 } }];
  headerRow.strokeWeight = 2;
  headerRow.strokeAlign = 'INSIDE'; // ✅ INSIDE
  headerRow.strokeTopWeight = 0;
  headerRow.strokeRightWeight = 0;
  headerRow.strokeLeftWeight = 0;
  headerRow.strokeBottomWeight = 2;

  tableFrame.appendChild(headerRow);
  headerRow.layoutSizingHorizontal = 'FILL';

  // Linhas da tabela com stroke bottom
  for (let i = 0; i < rows.length; i++) {
    if (rows[i].join('|').includes('Prop Name | Type | Default Value | Description')) continue;

    const rowFrame = figma.createFrame();
    rowFrame.name = `Table Row ${i + 1}`;
    rowFrame.layoutMode = 'HORIZONTAL';
    rowFrame.counterAxisSizingMode = 'AUTO';
    rowFrame.itemSpacing = 24;
    rowFrame.fills = [{ type: 'SOLID', color: { r: 1, g: 1, b: 1 } }];
    rowFrame.paddingLeft = 0;   // ✅ padding 0px
    rowFrame.paddingRight = 0;  // ✅ padding 0px
    rowFrame.paddingTop = 24;    
    rowFrame.paddingBottom = 24;

    // Stroke bottom 1px (exceto última row) - INSIDE
    const isLastRow = i === rows.length - 1;
    if (!isLastRow) {
      rowFrame.strokes = [{ type: 'SOLID', color: { r: 0.894, g: 0.894, b: 0.909 } }];
      rowFrame.strokeWeight = 1;
      rowFrame.strokeAlign = 'INSIDE'; // ✅ INSIDE
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
        cellText.layoutSizingHorizontal = 'FIXED';
      } else {
        cellText.layoutSizingHorizontal = 'FILL';
      }
    }
    tableFrame.appendChild(rowFrame);
    rowFrame.layoutSizingHorizontal = 'FILL';
  }

  containerFrame.appendChild(tableFrame);
  tableFrame.layoutSizingHorizontal = 'FILL';

  return containerFrame;
}

// Função principal para criar o layout estruturado
async function createStructuredDocumentation(data: string[][], componentName: string, mainFrame: FrameNode) {
  const organizedData = organizeDataByCategory(data, componentName);
  
  console.log('Organized data:', organizedData);
  
  for (const categoryName in organizedData) {
    const subCategories = organizedData[categoryName];

    // ✅ Tratar "2. Props" como tabela
    if (categoryName === "2. Props") {
      const categoryFrame = figma.createFrame();
      categoryFrame.name = `Category: ${categoryName}`;
      categoryFrame.layoutMode = 'VERTICAL';
      categoryFrame.counterAxisSizingMode = 'AUTO';
      categoryFrame.itemSpacing = 88;
      categoryFrame.fills = [];

      // Título + Divider
      const titleDividerFrame = figma.createFrame();
      titleDividerFrame.name = "Title & Divider";
      titleDividerFrame.layoutMode = 'VERTICAL';
      titleDividerFrame.counterAxisSizingMode = 'AUTO';
      titleDividerFrame.itemSpacing = 24;
      titleDividerFrame.fills = [];

      const categoryTitle = await createSimpleText(categoryName, 36, "Bold");
      titleDividerFrame.appendChild(categoryTitle);
      categoryTitle.layoutSizingHorizontal = 'FILL';

      const divider = createDividerLine();
      titleDividerFrame.appendChild(divider);
      divider.layoutSizingHorizontal = 'FILL';

      categoryFrame.appendChild(titleDividerFrame);
      titleDividerFrame.layoutSizingHorizontal = 'FILL';

      // Para cada subcategoria (Design Props, Code Props)
      for (const subCategoryName in subCategories) {
        const guidelines = subCategories[subCategoryName];
        const tableRows = guidelines.map(g => g.split('|').map(cell => cell.trim()));
        const propsTable = await createPropsTable(tableRows, subCategoryName);
        categoryFrame.appendChild(propsTable);
        propsTable.layoutSizingHorizontal = 'FILL';
      }

      mainFrame.appendChild(categoryFrame);
      categoryFrame.layoutSizingHorizontal = 'FILL';
      continue; // Pula o processamento padrão para "2. Props"
    }

    // ✅ Tratar "3. Anatomy" com layout especial
    if (categoryName === "3. Anatomy") {
      const categoryFrame = figma.createFrame();
      categoryFrame.name = `Category: ${categoryName}`;
      categoryFrame.layoutMode = 'VERTICAL';
      categoryFrame.counterAxisSizingMode = 'AUTO';
      categoryFrame.itemSpacing = 60;
      categoryFrame.fills = [];
      
      // 1. Título + Divider
      const titleDividerFrame = figma.createFrame();
      titleDividerFrame.name = "Title & Divider";
      titleDividerFrame.layoutMode = 'VERTICAL';
      titleDividerFrame.counterAxisSizingMode = 'AUTO';
      titleDividerFrame.itemSpacing = 24;
      titleDividerFrame.fills = [];
      
      const categoryTitle = await createSimpleText(categoryName, 36, "Bold");
      titleDividerFrame.appendChild(categoryTitle);
      categoryTitle.layoutSizingHorizontal = 'FILL';
      
      const divider = createDividerLine();
      titleDividerFrame.appendChild(divider);
      divider.layoutSizingHorizontal = 'FILL';
      
      categoryFrame.appendChild(titleDividerFrame);
      titleDividerFrame.layoutSizingHorizontal = 'FILL';
      
      // ✅ 2. Image Placeholder único (FILL CONTAINER)
      const imagePlaceholder = createImagePlaceholder();
      categoryFrame.appendChild(imagePlaceholder);
      imagePlaceholder.layoutSizingHorizontal = 'FILL'; // ✅ Preenche toda a largura
      
      // ✅ 3. SubCategories (SEM placeholders individuais)
      const subCategoriesFrame = figma.createFrame();
      subCategoriesFrame.name = "SubCategories";
      subCategoriesFrame.layoutMode = 'VERTICAL';
      subCategoriesFrame.counterAxisSizingMode = 'AUTO';
      subCategoriesFrame.itemSpacing = 96;
      subCategoriesFrame.fills = [];
      
      // Processar subcategorias SEM imagens
      for (const subCategoryName in subCategories) {
        const guidelines = subCategories[subCategoryName];
        
        if (guidelines.length === 0) continue;
        
        // ✅ Layout APENAS COM TEXTO (sem imagem placeholder)
        const subCategoryFrame = figma.createFrame();
        subCategoryFrame.name = `SubCategory: ${subCategoryName}`;
        subCategoryFrame.layoutMode = 'VERTICAL';
        subCategoriesFrame.counterAxisSizingMode = 'AUTO';
        subCategoryFrame.itemSpacing = 24;
        subCategoryFrame.fills = [];
        
        // Título da subcategoria (H3) - Bold
        if (subCategoryName.trim() && subCategoryName !== 'Main Content') {
          const subCategoryTitle = await createSimpleText(subCategoryName, 28, "Bold");
          subCategoryFrame.appendChild(subCategoryTitle);
          subCategoryTitle.layoutSizingHorizontal = 'FILL';
        }
        
        // Guidelines como bullet points
        for (const guideline of guidelines) {
          if (!guideline.trim()) continue;
          
          const bulletText = await createSimpleText(guideline, 22, "Regular", true);
          subCategoryFrame.appendChild(bulletText);
          bulletText.layoutSizingHorizontal = 'FILL';
        }
        
        subCategoriesFrame.appendChild(subCategoryFrame);
        subCategoryFrame.layoutSizingHorizontal = 'FILL';
      }
      
      // Adicionar subcategorias à categoria
      if (subCategoriesFrame.children.length > 0) {
        categoryFrame.appendChild(subCategoriesFrame);
        subCategoriesFrame.layoutSizingHorizontal = 'FILL';
      }
      
      mainFrame.appendChild(categoryFrame);
      categoryFrame.layoutSizingHorizontal = 'FILL';
      continue; // Pula o processamento padrão para "3. Anatomy"
    }

    console.log('Processing category:', categoryName);
    
    // ✅ Processamento padrão para outras categorias (1. Description, 4. Usage, etc.)
    const categoryFrame = figma.createFrame();
    categoryFrame.name = `Category: ${categoryName}`;
    categoryFrame.layoutMode = 'VERTICAL';
    categoryFrame.counterAxisSizingMode = 'AUTO';
    categoryFrame.itemSpacing = 60;
    categoryFrame.fills = [];
    
    // ✅ 1.1 Criar frame para título + divider
    const titleDividerFrame = figma.createFrame();
    titleDividerFrame.name = "Title & Divider";
    titleDividerFrame.layoutMode = 'VERTICAL';
    titleDividerFrame.counterAxisSizingMode = 'AUTO';
    titleDividerFrame.itemSpacing = 24;
    titleDividerFrame.fills = [];
    
    // 1.2 Título da categoria (H2)
    const categoryTitle = await createSimpleText(categoryName, 36, "Bold");
    titleDividerFrame.appendChild(categoryTitle);
    categoryTitle.layoutSizingHorizontal = 'FILL';
    
    // 1.3 Linha divisória
    const divider = createDividerLine();
    titleDividerFrame.appendChild(divider);
    divider.layoutSizingHorizontal = 'FILL';
    
    // ✅ Adicionar o frame título+divider ao categoryFrame
    categoryFrame.appendChild(titleDividerFrame);
    titleDividerFrame.layoutSizingHorizontal = 'FILL';
    
    // ✅ 2. Criar frame para agrupar todas as subcategorias
    const subCategoriesFrame = figma.createFrame();
    subCategoriesFrame.name = "SubCategories";
    subCategoriesFrame.layoutMode = 'VERTICAL';
    subCategoriesFrame.counterAxisSizingMode = 'AUTO';
    subCategoriesFrame.itemSpacing = 96;
    subCategoriesFrame.fills = [];
    
    // ✅ 3. Processar subcategorias com alternância de layout
    let subCategoryIndex = 0; // Contador para alternância
    
    for (const subCategoryName in subCategories) {
      const guidelines = subCategories[subCategoryName];
      
      console.log('Processing subcategory:', subCategoryName, 'Guidelines:', guidelines.length);
      
      if (guidelines.length === 0) continue;
      
      // Para "Main Content" (Description), não mostrar layout com imagem
      if (subCategoryName === 'Main Content') {
        // Layout simples só com texto
        const descriptionFrame = figma.createFrame();
        descriptionFrame.name = "Description";
        descriptionFrame.layoutMode = 'VERTICAL';
        descriptionFrame.counterAxisSizingMode = 'AUTO';
        descriptionFrame.itemSpacing = 36;
        descriptionFrame.fills = [];
        
        for (const guideline of guidelines) {
          if (!guideline.trim()) continue;
          const text = await createSimpleText(guideline, 30, "Regular");
          descriptionFrame.appendChild(text);
          text.layoutSizingHorizontal = 'FILL';
        }
        
        // ✅ Adicionar ao frame de subcategorias
        subCategoriesFrame.appendChild(descriptionFrame);
        descriptionFrame.layoutSizingHorizontal = 'FILL';
        continue; // Não conta para alternância
      }
      
      // ✅ Layout normal com alternância de posição da imagem
      const subCategoryFrame = figma.createFrame();
      subCategoryFrame.name = `SubCategory: ${subCategoryName}`;
      subCategoryFrame.layoutMode = 'HORIZONTAL';
      subCategoryFrame.counterAxisSizingMode = 'AUTO';
      subCategoryFrame.itemSpacing = 108;
      subCategoryFrame.fills = [];
      
      // Frame de conteúdo (texto)
      const contentFrame = figma.createFrame();
      contentFrame.name = "Content";
      contentFrame.layoutMode = 'VERTICAL';
      contentFrame.counterAxisSizingMode = 'AUTO';
      contentFrame.itemSpacing = 24;
      contentFrame.fills = [];
      
      // ✅ Título da subcategoria (H3) - Bold
      if (subCategoryName.trim()) {
        const subCategoryTitle = await createSimpleText(subCategoryName, 28, "Bold");
        contentFrame.appendChild(subCategoryTitle);
        subCategoryTitle.layoutSizingHorizontal = 'FILL';
      }
      
      // Guidelines como bullet points
      for (const guideline of guidelines) {
        if (!guideline.trim()) continue;
        
        const bulletText = await createSimpleText(guideline, 22, "Regular", true);
        contentFrame.appendChild(bulletText);
        bulletText.layoutSizingHorizontal = 'FILL';
      }
      
      // Placeholder de imagem
      const imagePlaceholder = createImagePlaceholder();
      
      // ✅ ALTERNÂNCIA: Par = Content à esquerda, Ímpar = Content à direita
      const isEven = subCategoryIndex % 2 === 0;
      
      if (isEven) {
        // SubCategory par: Content à esquerda, Image à direita
        subCategoryFrame.appendChild(contentFrame);
        subCategoryFrame.appendChild(imagePlaceholder);
      } else {
        // SubCategory ímpar: Image à esquerda, Content à direita
        subCategoryFrame.appendChild(imagePlaceholder);
        subCategoryFrame.appendChild(contentFrame);
      }
      
      contentFrame.layoutSizingHorizontal = 'FILL';
      
      // ✅ Adicionar subcategoria ao frame de subcategorias
      subCategoriesFrame.appendChild(subCategoryFrame);
      subCategoryFrame.layoutSizingHorizontal = 'FILL';
      
      // ✅ Incrementar contador para próxima alternância
      subCategoryIndex++;
    }
    
    // ✅ Adicionar frame de subcategorias à categoria (se não estiver vazio)
    if (subCategoriesFrame.children.length > 0) {
      categoryFrame.appendChild(subCategoriesFrame);
      subCategoriesFrame.layoutSizingHorizontal = 'FILL';
    }
    
    // Adicionar categoria ao frame principal
    mainFrame.appendChild(categoryFrame);
    categoryFrame.layoutSizingHorizontal = 'FILL';
  }
}

figma.ui.onmessage = async (msg) => {
  if (msg.type === 'create-doc') {
    const { component, data } = msg;
    
    console.log('Component:', component);
    console.log('Data rows:', data.length);
    
    // CARREGUE AS FONTES PRIMEIRO
    await loadRequiredFonts();

    // Criar o frame principal com largura fixa escalada
    const mainFrame = figma.createFrame();
    mainFrame.name = `UI Docs: ${component}`;
    mainFrame.resize(1115, 150); // ✅ 988 -> 1115 (1.13x), altura também escalada
    mainFrame.layoutMode = 'VERTICAL';
    mainFrame.counterAxisSizingMode = 'AUTO';
    mainFrame.itemSpacing = 108; // ✅ 72 -> 108 (1.5x)
    mainFrame.paddingLeft = 72; // ✅ 48 -> 72 (1.5x)
    mainFrame.paddingRight = 72; // ✅ 48 -> 72 (1.5x)
    mainFrame.paddingTop = 72; // ✅ 48 -> 72 (1.5x)
    mainFrame.paddingBottom = 72; // ✅ 48 -> 72 (1.5x)
    mainFrame.fills = [{ type: 'SOLID', color: { r: 1, g: 1, b: 1 } }];

    try {
      // ✅ Criar cabeçalho SEM auto-layout (HUG)
      const headerFrame = figma.createFrame();
      headerFrame.name = "Header";
      headerFrame.fills = [];
      
      // Título principal
      const title = await createSimpleText("UI Guidelines", 72, "Bold"); // ✅ 48 -> 72 (1.5x)
      title.x = 0;
      title.y = 0;
      headerFrame.appendChild(title);

      // Subtítulo com nome do componente
      const subtitle = await createSimpleText(component, 48, "Medium"); // ✅ 32 -> 48 (1.5x)
      subtitle.fills = [{ type: 'SOLID', color: { r: 0.2, g: 0.2, b: 0.2 } }];
      subtitle.x = 0;
      subtitle.y = title.height + 24; // ✅ 16 -> 24 (1.5x)
      headerFrame.appendChild(subtitle);

      // Ajustar tamanho do headerFrame (HUG)
      headerFrame.resize(Math.max(title.width, subtitle.width), title.height + 24 + subtitle.height); // ✅ 16 -> 24 (1.5x)

      mainFrame.appendChild(headerFrame);
      // ❌ Header NÃO tem FILL (fica HUG)

      // ✅ Criar documentação estruturada (categoryFrames com FILL)
      await createStructuredDocumentation(data, component, mainFrame);

      // Adicionar à página e focar
      figma.currentPage.appendChild(mainFrame);
      figma.viewport.scrollAndZoomIntoView([mainFrame]);
      
    } catch (error) {
      console.error('Erro ao criar frame:', error);
    }
  }
};
