Rails.application.routes.draw do
  get "/test", to: "campaigns#test"
  root to: "campaigns#index"
  resources :campaigns, except: [:edit, :update, :destroy] do
    member do
      get :show_moderator
      get :show_publisher
      get :show_subscriber
    end
  end
end