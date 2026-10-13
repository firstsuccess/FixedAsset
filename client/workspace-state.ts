type WorkspaceState = Record<string, any>;

export function companyDataReady(state: WorkspaceState, companyId: string) {
 return !!companyId && state.company?.id === companyId &&
  Array.isArray(state.assets) && Array.isArray(state.closings) && !!state.settings && !!state.masters;
}
