import fs from 'fs/promises';

async function testStorage() {
  try {
    console.log('Testing storage access...');
    
    // Test metadata directory
    const metadataFiles = await fs.readdir('../History/metadata');
    console.log('Metadata files found:', metadataFiles);
    
    // Test reading one metadata file
    if (metadataFiles.length > 0) {
      const firstFile = metadataFiles.find(f => f.endsWith('.json'));
      if (firstFile) {
        const content = await fs.readFile(`../History/metadata/${firstFile}`, 'utf-8');
        const metadata = JSON.parse(content);
        console.log('Sample metadata:', {
          id: metadata.id,
          analysisType: metadata.analysisType,
          createdAt: metadata.createdAt,
          modelUsed: metadata.modelUsed,
          aiModel: metadata.aiModel
        });
      }
    }
    
    // Test LocalAnalysisStorage
    const { LocalAnalysisStorage } = await import('./storage/LocalAnalysisStorage.js');
    const storage = new LocalAnalysisStorage({
      basePath: '../History',
      compression: false
    });
    
    const stats = await storage.getStats();
    console.log('Storage stats:', stats);
    
  } catch (error) {
    console.error('Error:', error);
  }
}

testStorage(); 