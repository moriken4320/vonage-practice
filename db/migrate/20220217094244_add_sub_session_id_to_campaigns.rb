class AddSubSessionIdToCampaigns < ActiveRecord::Migration[5.2]
  def change
    add_column :campaigns, :sub_session_id, :string, after: :session_id
  end
end
