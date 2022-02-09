Rails.application.routes.draw do
  get "/test", to: "campaigns#test"
  root to: "campaigns#index"
  resources :campaigns, except: [:edit, :update, :destroy]
end