Rails.application.routes.draw do
  devise_for :admins
  get "/test", to: "campaigns#test"
  root to: "campaigns#index"
  resources :campaigns, except: [:edit, :update, :destroy] do
    member do
      get :show_moderator
      get :show_publisher
      get :show_subscriber
      get :generate_publisher_token
    end
  end
end