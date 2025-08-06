export default {
  async fetch(request) {
    const sheetUrl = 'https://docs.google.com/spreadsheets/d/1sT2OZ4scZ8sHqNoq6_o863CRiEjwdiWv4v_Pr-BttWI/export?format=csv&gid=337086857';
    const sheetResponse = await fetch(sheetUrl);
    const csv = await sheetResponse.text();
    return new Response(csv, {
      headers: {
        'Content-Type': 'text/csv',
        'Access-Control-Allow-Origin': '*'
      }
    });
  }
};