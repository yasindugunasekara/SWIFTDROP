/** The subset shared by pg and the isolated PGlite integration harness. */
export interface OperationalDatabase {
  query(text: string, values?: any[]): Promise<{ rows: any[]; rowCount?: number | null }>;
}
