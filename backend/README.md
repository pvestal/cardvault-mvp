# CardVault Backend - Testing Implementation

## Overview

This is a comprehensive testing implementation for the CardVault MVP backend, featuring:

- **Unit Tests**: Isolated testing of individual components with mocking
- **Integration Tests**: End-to-end API testing with in-memory database
- **Comprehensive Coverage**: Authentication, CRUD operations, middleware, and services
- **Production-Ready**: CI/CD integration, coverage reporting, and best practices

## Technology Stack

- **Framework**: Express.js + TypeScript
- **Database**: PostgreSQL with pg-mem for testing
- **Testing**: Jest + Supertest + ts-jest
- **Authentication**: JWT + bcrypt
- **Encryption**: AES-256-GCM for sensitive data
- **Mocking**: Custom database and service mocks

## Project Structure

```
backend/
├── src/
│   ├── routes/           # API routes
│   ├── middleware/       # Authentication middleware
│   ├── services/         # Business logic services
│   ├── config/           # Configuration files
│   └── db/              # Database migrations
├── tests/
│   ├── unit/            # Unit tests with mocking
│   │   ├── routes/      # Route handler tests
│   │   ├── middleware/  # Middleware tests
│   │   └── services/    # Service layer tests
│   ├── integration/     # Integration tests
│   ├── helpers/         # Test utilities and helpers
│   ├── mocks/           # Mock implementations
│   └── setup.ts         # Global test configuration
├── jest.config.js       # Jest configuration
├── .env.test           # Test environment variables
└── .github/workflows/  # CI/CD configuration
```

## Testing Features

### 1. Unit Tests

**Authentication Routes (`tests/unit/routes/auth.test.ts`)**
- User registration validation
- Login authentication
- Password hashing verification
- JWT token generation
- Error handling scenarios

**Card CRUD Operations (`tests/unit/routes/cards.test.ts`)**
- Create, read, update, delete operations
- Data encryption/decryption
- Authorization checks
- Input validation
- Database error handling

**Authentication Middleware (`tests/unit/middleware/auth.test.ts`)**
- JWT token validation
- Request authorization
- Token expiration handling
- Error response formatting

**Crypto Service (`tests/unit/services/crypto.test.ts`)**
- AES-256-GCM encryption/decryption
- Data integrity verification
- Security properties validation
- Error handling for invalid data

### 2. Integration Tests

**Full API Testing (`tests/integration/`)**
- Complete request/response cycle testing
- Real database operations (in-memory)
- Multi-user data isolation
- Full authentication flow
- End-to-end card lifecycle

### 3. Test Utilities

**Database Testing (`tests/helpers/testDb.ts`)**
- In-memory PostgreSQL using pg-mem
- Automated schema setup
- Clean test isolation
- Proper cleanup management

**Test Helpers (`tests/helpers/testUtils.ts`)**
- User creation utilities
- Token generation helpers
- Response assertion functions
- Mock authentication middleware

### 4. Mocking Strategy

**Database Mocks (`tests/mocks/database.ts`)**
- Comprehensive PostgreSQL Pool mocking
- Query pattern matching
- Sequential response handling
- Call count tracking

**Service Mocks (`tests/mocks/crypto.ts`)**
- CryptoService encryption/decryption mocking
- Predictable test data generation
- Mock state management

## Running Tests

### Prerequisites

```bash
npm install
```

### Available Scripts

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run unit tests only
npm run test:unit

# Run integration tests only
npm run test:integration

# Run tests with coverage report
npm run test:coverage
```

### Test Coverage

The testing implementation includes comprehensive coverage tracking:

- **Statements**: 75%+ target
- **Branches**: 75%+ target
- **Functions**: 75%+ target
- **Lines**: 75%+ target

Coverage reports are generated in `coverage/` directory with HTML visualization.

## Environment Configuration

### Test Environment Variables

```bash
# .env.test
NODE_ENV=test
JWT_SECRET=test-jwt-secret-key-for-testing-only
ENCRYPTION_KEY=a1b2c3d4e5f6789012345678901234567890123456789012345678901234abcd
DATABASE_URL=postgresql://test:test@localhost:5432/cardvault_test
```

### Security Considerations

- All test data uses non-production keys
- In-memory database prevents data persistence
- Mock services prevent external calls
- Test isolation prevents cross-contamination

## CI/CD Integration

### GitHub Actions Workflow

The project includes a comprehensive CI/CD pipeline:

```yaml
# .github/workflows/test.yml
- Node.js matrix testing (18.x, 20.x)
- PostgreSQL service container
- Automated linting and type checking
- Full test suite execution
- Coverage reporting to Codecov
- Artifact preservation for debugging
```

### Quality Gates

- TypeScript compilation check
- ESLint code quality validation
- Jest test suite execution
- Coverage threshold enforcement
- Integration test validation

## Security Testing

### Authentication Security

- JWT token validation and expiration
- Password hashing verification (bcrypt)
- SQL injection prevention (parameterized queries)
- Input sanitization and validation

### Data Protection

- AES-256-GCM encryption for sensitive data
- Secure key management (environment variables)
- Data isolation between users
- Proper error handling without data leakage

### Authorization Testing

- Route-level access control
- User data isolation verification
- Token-based authentication validation
- Resource ownership verification

## Best Practices Implemented

### Test Organization

- Clear separation of unit vs integration tests
- Descriptive test names and structure
- Proper setup/teardown lifecycle
- Mock isolation and cleanup

### Code Quality

- TypeScript strict mode compliance
- Comprehensive error scenarios
- Realistic test data generation
- Performance consideration (timeouts)

### Maintainability

- Reusable test utilities and helpers
- Centralized mock management
- Clear documentation and examples
- Consistent naming conventions

## Performance Considerations

### Test Execution Speed

- In-memory database for fast operations
- Efficient mock implementations
- Parallel test execution where possible
- Optimized test setup/teardown

### Memory Management

- Proper cleanup after each test
- Mock state reset between tests
- Database connection management
- Resource cleanup in CI/CD

## Troubleshooting

### Common Issues

1. **TypeScript Compilation Errors**
   ```bash
   npx tsc --noEmit
   ```

2. **Mock Reset Issues**
   ```bash
   # Ensure proper beforeEach cleanup
   jest.clearAllMocks()
   ```

3. **Database Connection Issues**
   ```bash
   # Check test environment variables
   cat .env.test
   ```

4. **Coverage Threshold Failures**
   ```bash
   # Run with verbose coverage
   npm run test:coverage -- --verbose
   ```

### Debugging Tests

```bash
# Debug specific test file
npm test -- auth.test.ts --verbose

# Debug with Node inspector
node --inspect-brk node_modules/.bin/jest --runInBand

# View coverage details
open coverage/index.html
```

## Contributing

### Adding New Tests

1. Follow the established directory structure
2. Use appropriate mocking strategies
3. Include both positive and negative test cases
4. Maintain coverage thresholds
5. Update documentation as needed

### Test Naming Conventions

- Describe what is being tested
- Use "should" language for expected behavior
- Include edge cases and error scenarios
- Group related tests in describe blocks

## Dependencies

### Testing Dependencies

```json
{
  "@types/jest": "^29.5.12",
  "@types/supertest": "^6.0.2",
  "jest": "^29.7.0",
  "jest-environment-node": "^29.7.0",
  "pg-mem": "^3.0.1",
  "supertest": "^6.3.4",
  "ts-jest": "^29.1.1"
}
```

### Production Dependencies

All production dependencies are properly mocked or isolated in tests to ensure reliable and fast test execution.

## License

This testing implementation follows the same license as the CardVault MVP project.