import {
  selectTableScenario,
  SCENARIO_TABLE_UNENCRYPTED_NO_CHANGE,
  SCENARIO_TABLE_UNENCRYPTED_CHANGE,
  SCENARIO_TABLE_ENCRYPTED_CHANGE,
  SCENARIO_TABLE_ENCRYPTED_NO_CHANGE,
  ENCRYPTION_SETTINGS_TABLE,
  SCENARIO_TABLE_IS_SETTINGS_TABLE,
} from './utils';

describe('processTable', () => {
  it('Scenario 1', () => {
    const result = selectTableScenario({ name: 'test' }, [], []);
    expect(result).toEqual(SCENARIO_TABLE_UNENCRYPTED_NO_CHANGE);
  });
  it('Scenario 2', () => {
    const result = selectTableScenario({ name: 'test' }, ['test'], []);
    expect(result).toEqual(SCENARIO_TABLE_UNENCRYPTED_CHANGE);
  });
  it('Scenario 3', () => {
    const result = selectTableScenario({ name: 'test' }, [], ['test']);
    expect(result).toEqual(SCENARIO_TABLE_ENCRYPTED_CHANGE);
  });
  it('Scenario 4', () => {
    const result = selectTableScenario({ name: 'test' }, ['test'], ['test']);
    expect(result).toEqual(SCENARIO_TABLE_ENCRYPTED_NO_CHANGE);
  });
  it('Scenario 5', () => {
    const result = selectTableScenario({ name: ENCRYPTION_SETTINGS_TABLE }, ['test'], ['test']);
    expect(result).toEqual(SCENARIO_TABLE_IS_SETTINGS_TABLE);
  });
});
