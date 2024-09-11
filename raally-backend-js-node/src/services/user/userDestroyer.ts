
import SequelizeRepository from '../../database/repositories/sequelizeRepository';
import UserRepository from '../../database/repositories/userRepository';
import TenantUserRepository from '../../database/repositories/tenantUserRepository';
import assert from 'assert';
import Error400 from '../../errors/Error400';
import Plans from '../../security/plans';
import { IServiceOptions } from '../IServiceOptions';

/**
 * Defines the shape of the data parameter for user removal.
 */
interface UserDestroyerData {
  ids: string | string[];
}

/**
 * Handles the removal of user permissions.
 */
export default class UserDestroyer {
  options: IServiceOptions;
  transaction: any;  // Ideally, replace `any` with a more specific type if possible
  data: UserDestroyerData;

  constructor(options: IServiceOptions) {
    this.options = options;
    this.data = { ids: [] };  // Initialize data with a default value
  }

  /**
   * Removes all specified users.
   * @param data - Contains user IDs to remove.
   */
  async destroyAll(data: UserDestroyerData) {
    this.data = data;

    await this._validate();

    try {
      this.transaction = await SequelizeRepository.createTransaction(
        this.options.database,
      );

      await Promise.all(
        this._ids.map((id) => this._destroy(id)),
      );

      await SequelizeRepository.commitTransaction(this.transaction);
    } catch (error) {
      await SequelizeRepository.rollbackTransaction(this.transaction);
      throw error;
    }
  }

  private get _ids(): string[] {
    const ids = this.data.ids;
    if (ids && !Array.isArray(ids)) {
      return [ids];
    } else {
      return [...new Set(ids)].map(id => id.trim()); // TypeScript now infers id as string
    }
  }

  private async _destroy(id: string) {
    const user = await UserRepository.findByIdWithoutAvatar(id, this.options);

    if (!user) {
      throw new Error400(this.options.language, 'user.errors.userNotFound');
    }

    await TenantUserRepository.destroy(
      this.options.currentTenant.id,
      user.id,
      this.options,
    );
  }

  private async _isRemovingPlanUser(): Promise<boolean> {
    const currentTenant = this.options.currentTenant;

    if (currentTenant.plan === Plans.values.free || !currentTenant.planUserId) {
      return false;
    }

    return this._ids.includes(String(currentTenant.planUserId));
  }

  private _isRemovingHimself(): boolean {
    return this._ids.includes(String(this.options.currentUser.id));
  }

  private async _validate() {
    assert(this.options.currentTenant.id, 'tenantId is required');
    assert(this.options.currentUser, 'currentUser is required');
    assert(this.options.currentUser.id, 'currentUser.id is required');
    assert(this.options.currentUser.email, 'currentUser.email is required');
    assert(this._ids.length, 'ids is required and cannot be empty');

    if (await this._isRemovingPlanUser()) {
      throw new Error400(this.options.language, 'user.errors.destroyingPlanUser');
    }

    if (this._isRemovingHimself()) {
      throw new Error400(this.options.language, 'user.errors.destroyingHimself');
    }
  }
}
