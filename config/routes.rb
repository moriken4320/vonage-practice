Rails.application.routes.draw do
  devise_for :users
  devise_for :admins
  root to: "campaigns#index"
  resources :campaigns, except: [:edit, :update, :destroy] do
    member do
      get :show_moderator
      get :show_publisher
      get :show_subscriber
      get :generate_moderator_token
      get :generate_publisher_token
      get :generate_subscriber_token
      get :start_broadcast
      get :stop_broadcast
      put :start_recording
      put :stop_recording
      put :change_archive_layout
    end
  end
end