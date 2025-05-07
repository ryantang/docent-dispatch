import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

// Ensure the output directory exists
const outputDir = path.join(__dirname, '../client/src/types');
if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
}

// Generate types using openapi-typescript
try {
    execSync(
        'npx openapi-typescript http://localhost:5000/api/docs/swagger.json --output client/src/types/api.ts',
        { stdio: 'inherit' }
    );
    console.log('Successfully generated TypeScript types from OpenAPI schema');
} catch (error) {
    console.error('Failed to generate TypeScript types:', error);
    process.exit(1);
} 