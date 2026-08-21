export interface Customer {
  readonly id: string;
  readonly name: string;
  readonly tier: string;
}

export interface CustomerProvider {
  getCustomer(customerId: string): Promise<Customer | undefined>;
}
