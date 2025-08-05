// figma-plugin/code.ts
figma.showUI(__html__, { width: 320, height: 300 });

figma.ui.onmessage = async (msg) => {
  if (msg.type === 'create-doc') {
    const { component, data } = msg;

    const frame = figma.createFrame();
    frame.name = `UI Guidelines: ${component}`;
    frame.resize(800, 1600);
    frame.layoutMode = 'VERTICAL';
    frame.counterAxisSizingMode = 'AUTO';
    frame.primaryAxisSizingMode = 'AUTO';
    frame.itemSpacing = 32;
    frame.paddingLeft = frame.paddingRight = 48;
    frame.paddingTop = frame.paddingBottom = 48;

    const title = figma.createText();
    title.characters = `UI Guidelines`;
    await figma.loadFontAsync({ family: "Inter", style: "Bold" });
    title.fontSize = 48;
    title.fills = [{ type: 'SOLID', color: { r: 0, g: 0, b: 0 } }];
    frame.appendChild(title);

    const subtitle = figma.createText();
    subtitle.characters = component;
    await figma.loadFontAsync({ family: "Inter", style: "Regular" });
    subtitle.fontSize = 24;
    subtitle.fills = [{ type: 'SOLID', color: { r: 0.2, g: 0.2, b: 0.2 } }];
    frame.appendChild(subtitle);

    figma.currentPage.appendChild(frame);
    figma.viewport.scrollAndZoomIntoView([frame]);
    figma.closePlugin();
  }
}

