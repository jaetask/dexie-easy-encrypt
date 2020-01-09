import {
  selectTableScenario,
  SCENARIO_1,
  SCENARIO_2,
  SCENARIO_3,
  SCENARIO_4,
  ENCRYPTION_SETTINGS_TABLE,
  SCENARIO_5,
} from './index';

describe('processTable', () => {
  it('Scenario 1', () => {
    const result = selectTableScenario({ name: 'test' }, [], []);
    expect(result).toEqual(SCENARIO_1);
  });
  it('Scenario 2', () => {
    const result = selectTableScenario({ name: 'test' }, ['test'], []);
    expect(result).toEqual(SCENARIO_2);
  });
  it('Scenario 3', () => {
    const result = selectTableScenario({ name: 'test' }, [], ['test']);
    expect(result).toEqual(SCENARIO_3);
  });
  it('Scenario 4', () => {
    const result = selectTableScenario({ name: 'test' }, ['test'], ['test']);
    expect(result).toEqual(SCENARIO_4);
  });
  it('Scenario 5', () => {
    const result = selectTableScenario({ name: ENCRYPTION_SETTINGS_TABLE }, ['test'], ['test']);
    expect(result).toEqual(SCENARIO_5);
  });
});
