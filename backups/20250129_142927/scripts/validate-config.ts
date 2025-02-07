#!/usr/bin/env node
import { parseConfig } from '../lib/config/parser';
import { validateConfig } from '../lib/config/validate';
import chalk from 'chalk';

function validateEnvironment() {
  console.log(chalk.blue('Validating configuration...'));

  try {
    const config = parseConfig();
    const errors = validateConfig(config);

    if (errors.length === 0) {
      console.log(chalk.green('✓ Configuration is valid'));
      return;
    }

    console.log(chalk.red(`✗ Found ${errors.length} configuration error(s):`));
    errors.forEach((error) => {
      console.log(chalk.yellow(`  - ${error.field}: ${error.message}`));
    });

    process.exit(1);
  } catch (error) {
    console.error(chalk.red('Error validating configuration:'));
    console.error(error);
    process.exit(1);
  }
}

function checkRequiredFiles() {
  const fs = require('fs');
  const path = require('path');

  const requiredFiles = [
    '.env.local',
    '.env.development',
    '.env.production',
  ];

  console.log(chalk.blue('Checking required files...'));

  requiredFiles.forEach((file) => {
    const filePath = path.join(process.cwd(), file);
    if (!fs.existsSync(filePath)) {
      console.log(chalk.yellow(`Warning: ${file} is missing`));
    } else {
      console.log(chalk.green(`✓ ${file} exists`));
    }
  });
}

function main() {
  console.log(chalk.bold('Configuration Validator'));
  console.log('========================');
  
  checkRequiredFiles();
  console.log('');
  validateEnvironment();
}

main(); 