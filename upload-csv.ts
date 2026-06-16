import pg from 'pg';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import dotenv from 'dotenv';

dotenv.config();

const csvData = `name,category,price,stock,image_url,seller_id,is_active
Egg biryani,Biryani & Rice Dishes,225,100,https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?w=500&auto=format&fit=crop&q=60,0aaa8167-5261-4670-a5fb-265cbc3b7910,True
Bamboo Chicken biryani Single,Biryani & Rice Dishes,175,100,https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?w=500&auto=format&fit=crop&q=60,0aaa8167-5261-4670-a5fb-265cbc3b7910,True
Chicken biryani Full,Biryani & Rice Dishes,295,100,https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?w=500&auto=format&fit=crop&q=60,0aaa8167-5261-4670-a5fb-265cbc3b7910,True
Chicken Fry Piece Regular,Biryani & Rice Dishes,315,100,https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?w=500&auto=format&fit=crop&q=60,0aaa8167-5261-4670-a5fb-265cbc3b7910,True
Chicken boneless Regular,Biryani & Rice Dishes,325,100,https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?w=500&auto=format&fit=crop&q=60,0aaa8167-5261-4670-a5fb-265cbc3b7910,True
Fish biryani,Biryani & Rice Dishes,365,100,https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?w=500&auto=format&fit=crop&q=60,0aaa8167-5261-4670-a5fb-265cbc3b7910,True
Mutton biryani,Biryani & Rice Dishes,365,100,https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?w=500&auto=format&fit=crop&q=60,0aaa8167-5261-4670-a5fb-265cbc3b7910,True
Prawns biryani,Biryani & Rice Dishes,365,100,https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?w=500&auto=format&fit=crop&q=60,0aaa8167-5261-4670-a5fb-265cbc3b7910,True
Mughlai biryani,Biryani & Rice Dishes,315,100,https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?w=500&auto=format&fit=crop&q=60,0aaa8167-5261-4670-a5fb-265cbc3b7910,True
Lollipop Regular,Biryani & Rice Dishes,365,100,https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?w=500&auto=format&fit=crop&q=60,0aaa8167-5261-4670-a5fb-265cbc3b7910,True
Veg Biryani,Biryani & Rice Dishes,225,100,https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?w=500&auto=format&fit=crop&q=60,0aaa8167-5261-4670-a5fb-265cbc3b7910,True
Paneer biryani,Biryani & Rice Dishes,265,100,https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?w=500&auto=format&fit=crop&q=60,0aaa8167-5261-4670-a5fb-265cbc3b7910,True
Kaju Biryani,Biryani & Rice Dishes,265,100,https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?w=500&auto=format&fit=crop&q=60,0aaa8167-5261-4670-a5fb-265cbc3b7910,True
Kaju Paneer Biryani,Biryani & Rice Dishes,265,100,https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?w=500&auto=format&fit=crop&q=60,0aaa8167-5261-4670-a5fb-265cbc3b7910,True
Mushroom Biryani,Biryani & Rice Dishes,265,100,https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?w=500&auto=format&fit=crop&q=60,0aaa8167-5261-4670-a5fb-265cbc3b7910,True
Jeera Rice,Biryani & Rice Dishes,185,100,https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=500&auto=format&fit=crop&q=60,0aaa8167-5261-4670-a5fb-265cbc3b7910,True
Curd Rice,Biryani & Rice Dishes,165,100,https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=500&auto=format&fit=crop&q=60,0aaa8167-5261-4670-a5fb-265cbc3b7910,True
Kaju Panner Pulao,Biryani & Rice Dishes,265,100,https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=500&auto=format&fit=crop&q=60,0aaa8167-5261-4670-a5fb-265cbc3b7910,True
Kaju Pulao,Biryani & Rice Dishes,265,100,https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=500&auto=format&fit=crop&q=60,0aaa8167-5261-4670-a5fb-265cbc3b7910,True
Tomato Pulao,Biryani & Rice Dishes,265,100,https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=500&auto=format&fit=crop&q=60,0aaa8167-5261-4670-a5fb-265cbc3b7910,True
Tomato Mushroom Pulao,Biryani & Rice Dishes,265,100,https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=500&auto=format&fit=crop&q=60,0aaa8167-5261-4670-a5fb-265cbc3b7910,True
Steam Rice,Biryani & Rice Dishes,145,100,https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=500&auto=format&fit=crop&q=60,0aaa8167-5261-4670-a5fb-265cbc3b7910,True
Mutter Pulao,Biryani & Rice Dishes,265,100,https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=500&auto=format&fit=crop&q=60,0aaa8167-5261-4670-a5fb-265cbc3b7910,True
Mushroom Fried Rice,Fried Rice,205,100,https://images.unsplash.com/photo-1603133872878-684f208fb84b?w=500&auto=format&fit=crop&q=60,0aaa8167-5261-4670-a5fb-265cbc3b7910,True
Corn & Capcicum Fried Rice,Fried Rice,205,100,https://images.unsplash.com/photo-1603133872878-684f208fb84b?w=500&auto=format&fit=crop&q=60,0aaa8167-5261-4670-a5fb-265cbc3b7910,True
Veg Manchurian Fried Rice,Fried Rice,205,100,https://images.unsplash.com/photo-1603133872878-684f208fb84b?w=500&auto=format&fit=crop&q=60,0aaa8167-5261-4670-a5fb-265cbc3b7910,True
Veg Fried Rice,Fried Rice,205,100,https://images.unsplash.com/photo-1603133872878-684f208fb84b?w=500&auto=format&fit=crop&q=60,0aaa8167-5261-4670-a5fb-265cbc3b7910,True
Schezwon Veg Fried Rice,Fried Rice,205,100,https://images.unsplash.com/photo-1603133872878-684f208fb84b?w=500&auto=format&fit=crop&q=60,0aaa8167-5261-4670-a5fb-265cbc3b7910,True
Brount Veg Fried Rice,Fried Rice,205,100,https://images.unsplash.com/photo-1603133872878-684f208fb84b?w=500&auto=format&fit=crop&q=60,0aaa8167-5261-4670-a5fb-265cbc3b7910,True
Veg Chilli Garlic Fried Rice,Fried Rice,205,100,https://images.unsplash.com/photo-1603133872878-684f208fb84b?w=500&auto=format&fit=crop&q=60,0aaa8167-5261-4670-a5fb-265cbc3b7910,True
Green Pepper Fried Rice,Fried Rice,205,100,https://images.unsplash.com/photo-1603133872878-684f208fb84b?w=500&auto=format&fit=crop&q=60,0aaa8167-5261-4670-a5fb-265cbc3b7910,True
Veg Spl Pepper Fried Rice,Fried Rice,205,100,https://images.unsplash.com/photo-1603133872878-684f208fb84b?w=500&auto=format&fit=crop&q=60,0aaa8167-5261-4670-a5fb-265cbc3b7910,True
Chicken Fried Rice,Fried Rice,265,100,https://images.unsplash.com/photo-1603133872878-684f208fb84b?w=500&auto=format&fit=crop&q=60,0aaa8167-5261-4670-a5fb-265cbc3b7910,True
Egg Fried Rice,Fried Rice,205,100,https://images.unsplash.com/photo-1603133872878-684f208fb84b?w=500&auto=format&fit=crop&q=60,0aaa8167-5261-4670-a5fb-265cbc3b7910,True
Chicken Schezwan Fried Rice,Fried Rice,265,100,https://images.unsplash.com/photo-1603133872878-684f208fb84b?w=500&auto=format&fit=crop&q=60,0aaa8167-5261-4670-a5fb-265cbc3b7910,True
Egg Schezwan Fried Rice,Fried Rice,265,100,https://images.unsplash.com/photo-1603133872878-684f208fb84b?w=500&auto=format&fit=crop&q=60,0aaa8167-5261-4670-a5fb-265cbc3b7910,True
Prawns Fried Rice,Fried Rice,275,100,https://images.unsplash.com/photo-1603133872878-684f208fb84b?w=500&auto=format&fit=crop&q=60,0aaa8167-5261-4670-a5fb-265cbc3b7910,True
Schezwan Fried Rice (Prawns),Fried Rice,265,100,https://images.unsplash.com/photo-1603133872878-684f208fb84b?w=500&auto=format&fit=crop&q=60,0aaa8167-5261-4670-a5fb-265cbc3b7910,True
Chicken Manchuria Friend Rice,Fried Rice,265,100,https://images.unsplash.com/photo-1603133872878-684f208fb84b?w=500&auto=format&fit=crop&q=60,0aaa8167-5261-4670-a5fb-265cbc3b7910,True
Mixed Fried Rice,Fried Rice,315,100,https://images.unsplash.com/photo-1603133872878-684f208fb84b?w=500&auto=format&fit=crop&q=60,0aaa8167-5261-4670-a5fb-265cbc3b7910,True
Mixed Schezwan Fried Rice,Fried Rice,315,100,https://images.unsplash.com/photo-1603133872878-684f208fb84b?w=500&auto=format&fit=crop&q=60,0aaa8167-5261-4670-a5fb-265cbc3b7910,True
Chilli Garlic Fried Rice,Fried Rice,265,100,https://images.unsplash.com/photo-1603133872878-684f208fb84b?w=500&auto=format&fit=crop&q=60,0aaa8167-5261-4670-a5fb-265cbc3b7910,True
Green Pepper Fried Rice (Duplicate),Fried Rice,265,100,https://images.unsplash.com/photo-1603133872878-684f208fb84b?w=500&auto=format&fit=crop&q=60,0aaa8167-5261-4670-a5fb-265cbc3b7910,True
Spl Pepper Fried Rice,Fried Rice,265,100,https://images.unsplash.com/photo-1603133872878-684f208fb84b?w=500&auto=format&fit=crop&q=60,0aaa8167-5261-4670-a5fb-265cbc3b7910,True
Veg Soft Noodles,Fried Rice,205,100,https://images.unsplash.com/photo-1585032226651-759b368d7246?w=500&auto=format&fit=crop&q=60,0aaa8167-5261-4670-a5fb-265cbc3b7910,True
Veg Schezwan Noodles,Fried Rice,205,100,https://images.unsplash.com/photo-1585032226651-759b368d7246?w=500&auto=format&fit=crop&q=60,0aaa8167-5261-4670-a5fb-265cbc3b7910,True
Veg Mushroom Noodles,Fried Rice,205,100,https://images.unsplash.com/photo-1585032226651-759b368d7246?w=500&auto=format&fit=crop&q=60,0aaa8167-5261-4670-a5fb-265cbc3b7910,True
Veg Brount Garlic Noodles,Fried Rice,205,100,https://images.unsplash.com/photo-1585032226651-759b368d7246?w=500&auto=format&fit=crop&q=60,0aaa8167-5261-4670-a5fb-265cbc3b7910,True
Veg American Chopsy & Fried Noodles,Fried Rice,205,100,https://images.unsplash.com/photo-1585032226651-759b368d7246?w=500&auto=format&fit=crop&q=60,0aaa8167-5261-4670-a5fb-265cbc3b7910,True
Veg Chineese Chopsy & Fried Noodles,Fried Rice,205,100,https://images.unsplash.com/photo-1585032226651-759b368d7246?w=500&auto=format&fit=crop&q=60,0aaa8167-5261-4670-a5fb-265cbc3b7910,True
Veg Chilli Garlic Noodles,Fried Rice,205,100,https://images.unsplash.com/photo-1585032226651-759b368d7246?w=500&auto=format&fit=crop&q=60,0aaa8167-5261-4670-a5fb-265cbc3b7910,True
Veg Hucca Noodles,Fried Rice,205,100,https://images.unsplash.com/photo-1585032226651-759b368d7246?w=500&auto=format&fit=crop&q=60,0aaa8167-5261-4670-a5fb-265cbc3b7910,True
Veg Pepper Noodles,Fried Rice,205,100,https://images.unsplash.com/photo-1585032226651-759b368d7246?w=500&auto=format&fit=crop&q=60,0aaa8167-5261-4670-a5fb-265cbc3b7910,True
Veg Shanghai Noodles,Fried Rice,205,100,https://images.unsplash.com/photo-1585032226651-759b368d7246?w=500&auto=format&fit=crop&q=60,0aaa8167-5261-4670-a5fb-265cbc3b7910,True
Veg Bound Garlic Noodles,Fried Rice,205,100,https://images.unsplash.com/photo-1585032226651-759b368d7246?w=500&auto=format&fit=crop&q=60,0aaa8167-5261-4670-a5fb-265cbc3b7910,True
Chicken Soft Noodles,Fried Rice,215,100,https://images.unsplash.com/photo-1585032226651-759b368d7246?w=500&auto=format&fit=crop&q=60,0aaa8167-5261-4670-a5fb-265cbc3b7910,True
Chicken Schezwan Noodles,Fried Rice,215,100,https://images.unsplash.com/photo-1585032226651-759b368d7246?w=500&auto=format&fit=crop&q=60,0aaa8167-5261-4670-a5fb-265cbc3b7910,True
Egg Soft Noodles,Fried Rice,215,100,https://images.unsplash.com/photo-1585032226651-759b368d7246?w=500&auto=format&fit=crop&q=60,0aaa8167-5261-4670-a5fb-265cbc3b7910,True
Egg Schezwan Noodles,Fried Rice,215,100,https://images.unsplash.com/photo-1585032226651-759b368d7246?w=500&auto=format&fit=crop&q=60,0aaa8167-5261-4670-a5fb-265cbc3b7910,True
Chilli Garlic Noodles,Fried Rice,215,100,https://images.unsplash.com/photo-1585032226651-759b368d7246?w=500&auto=format&fit=crop&q=60,0aaa8167-5261-4670-a5fb-265cbc3b7910,True
Hucca Noodles,Fried Rice,215,100,https://images.unsplash.com/photo-1585032226651-759b368d7246?w=500&auto=format&fit=crop&q=60,0aaa8167-5261-4670-a5fb-265cbc3b7910,True
Pepper Noodles,Fried Rice,215,100,https://images.unsplash.com/photo-1585032226651-759b368d7246?w=500&auto=format&fit=crop&q=60,0aaa8167-5261-4670-a5fb-265cbc3b7910,True
Shanghai Noodles,Fried Rice,215,100,https://images.unsplash.com/photo-1585032226651-759b368d7246?w=500&auto=format&fit=crop&q=60,0aaa8167-5261-4670-a5fb-265cbc3b7910,True
Bound Garlic Noodles,Fried Rice,195,100,https://images.unsplash.com/photo-1585032226651-759b368d7246?w=500&auto=format&fit=crop&q=60,0aaa8167-5261-4670-a5fb-265cbc3b7910,True
Loose Mushroom,Starters,245,100,https://images.unsplash.com/photo-1599487488170-d11ec9c172f0?w=500&auto=format&fit=crop&q=60,0aaa8167-5261-4670-a5fb-265cbc3b7910,True
Cashew Nuts Crispy Corn,Starters,245,100,https://images.unsplash.com/photo-1599487488170-d11ec9c172f0?w=500&auto=format&fit=crop&q=60,0aaa8167-5261-4670-a5fb-265cbc3b7910,True
Dry Chicken,Starters,265,100,https://images.unsplash.com/photo-1599487488170-d11ec9c172f0?w=500&auto=format&fit=crop&q=60,0aaa8167-5261-4670-a5fb-265cbc3b7910,True
Chicken Drumsticks,Starters,315,100,https://images.unsplash.com/photo-1599487488170-d11ec9c172f0?w=500&auto=format&fit=crop&q=60,0aaa8167-5261-4670-a5fb-265cbc3b7910,True
Chicken Lollipop,Starters,315,100,https://images.unsplash.com/photo-1599487488170-d11ec9c172f0?w=500&auto=format&fit=crop&q=60,0aaa8167-5261-4670-a5fb-265cbc3b7910,True
Singapuri Chicken Dry,Starters,265,100,https://images.unsplash.com/photo-1599487488170-d11ec9c172f0?w=500&auto=format&fit=crop&q=60,0aaa8167-5261-4670-a5fb-265cbc3b7910,True
Chicken Crispy Lion,Starters,265,100,https://images.unsplash.com/photo-1599487488170-d11ec9c172f0?w=500&auto=format&fit=crop&q=60,0aaa8167-5261-4670-a5fb-265cbc3b7910,True
Crispy Chicken,Starters,265,100,https://images.unsplash.com/photo-1599487488170-d11ec9c172f0?w=500&auto=format&fit=crop&q=60,0aaa8167-5261-4670-a5fb-265cbc3b7910,True
Besil Chicken,Starters,265,100,https://images.unsplash.com/photo-1599487488170-d11ec9c172f0?w=500&auto=format&fit=crop&q=60,0aaa8167-5261-4670-a5fb-265cbc3b7910,True
Murgh Angara Kebab,Starters,285,100,https://images.unsplash.com/photo-1599487488170-d11ec9c172f0?w=500&auto=format&fit=crop&q=60,0aaa8167-5261-4670-a5fb-265cbc3b7910,True
Reshmi Kebab,Starters,295,100,https://images.unsplash.com/photo-1599487488170-d11ec9c172f0?w=500&auto=format&fit=crop&q=60,0aaa8167-5261-4670-a5fb-265cbc3b7910,True
Murgh Malai Kebab,Starters,285,100,https://images.unsplash.com/photo-1599487488170-d11ec9c172f0?w=500&auto=format&fit=crop&q=60,0aaa8167-5261-4670-a5fb-265cbc3b7910,True
Hariyali Murgh Kabab,Starters,275,100,https://images.unsplash.com/photo-1599487488170-d11ec9c172f0?w=500&auto=format&fit=crop&q=60,0aaa8167-5261-4670-a5fb-265cbc3b7910,True
Pahadi Kebab,Starters,285,100,https://images.unsplash.com/photo-1599487488170-d11ec9c172f0?w=500&auto=format&fit=crop&q=60,0aaa8167-5261-4670-a5fb-265cbc3b7910,True
Achari Murgh Tikka,Starters,285,100,https://images.unsplash.com/photo-1599487488170-d11ec9c172f0?w=500&auto=format&fit=crop&q=60,0aaa8167-5261-4670-a5fb-265cbc3b7910,True
Appolo Fish,Starters,345,100,https://images.unsplash.com/photo-1599487488170-d11ec9c172f0?w=500&auto=format&fit=crop&q=60,0aaa8167-5261-4670-a5fb-265cbc3b7910,True
Chilli Loose Prawns,Starters,345,100,https://images.unsplash.com/photo-1599487488170-d11ec9c172f0?w=500&auto=format&fit=crop&q=60,0aaa8167-5261-4670-a5fb-265cbc3b7910,True
Loose Prawns,Starters,345,100,https://images.unsplash.com/photo-1599487488170-d11ec9c172f0?w=500&auto=format&fit=crop&q=60,0aaa8167-5261-4670-a5fb-265cbc3b7910,True
Shanghai Rolls,Starters,275,100,https://images.unsplash.com/photo-1599487488170-d11ec9c172f0?w=500&auto=format&fit=crop&q=60,0aaa8167-5261-4670-a5fb-265cbc3b7910,True
Spring Rolls,Starters,275,100,https://images.unsplash.com/photo-1599487488170-d11ec9c172f0?w=500&auto=format&fit=crop&q=60,0aaa8167-5261-4670-a5fb-265cbc3b7910,True
Veg Dragon Rolls,Starters,275,100,https://images.unsplash.com/photo-1599487488170-d11ec9c172f0?w=500&auto=format&fit=crop&q=60,0aaa8167-5261-4670-a5fb-265cbc3b7910,True
Veg Cheez Rolls,Starters,275,100,https://images.unsplash.com/photo-1599487488170-d11ec9c172f0?w=500&auto=format&fit=crop&q=60,0aaa8167-5261-4670-a5fb-265cbc3b7910,True
Korean Rolls,Starters,295,100,https://images.unsplash.com/photo-1599487488170-d11ec9c172f0?w=500&auto=format&fit=crop&q=60,0aaa8167-5261-4670-a5fb-265cbc3b7910,True
Spring Rolls (Duplicate),Starters,295,100,https://images.unsplash.com/photo-1599487488170-d11ec9c172f0?w=500&auto=format&fit=crop&q=60,0aaa8167-5261-4670-a5fb-265cbc3b7910,True
Chicken Dragon Rolls,Starters,295,100,https://images.unsplash.com/photo-1599487488170-d11ec9c172f0?w=500&auto=format&fit=crop&q=60,0aaa8167-5261-4670-a5fb-265cbc3b7910,True
Plain Naan,Breads,55,100,https://images.unsplash.com/photo-1601050690597-df056fb4ce78?w=500&auto=format&fit=crop&q=60,0aaa8167-5261-4670-a5fb-265cbc3b7910,True
Butter Naan,Breads,60,100,https://images.unsplash.com/photo-1601050690597-df056fb4ce78?w=500&auto=format&fit=crop&q=60,0aaa8167-5261-4670-a5fb-265cbc3b7910,True
Tandoori Roti,Breads,45,100,https://images.unsplash.com/photo-1601050690597-df056fb4ce78?w=500&auto=format&fit=crop&q=60,0aaa8167-5261-4670-a5fb-265cbc3b7910,True
Tandoori Butter Roti,Breads,50,100,https://images.unsplash.com/photo-1601050690597-df056fb4ce78?w=500&auto=format&fit=crop&q=60,0aaa8167-5261-4670-a5fb-265cbc3b7910,True
Rumali Roti,Breads,55,100,https://images.unsplash.com/photo-1601050690597-df056fb4ce78?w=500&auto=format&fit=crop&q=60,0aaa8167-5261-4670-a5fb-265cbc3b7910,True
Garlic Naan,Breads,65,100,https://images.unsplash.com/photo-1601050690597-df056fb4ce78?w=500&auto=format&fit=crop&q=60,0aaa8167-5261-4670-a5fb-265cbc3b7910,True
Plain Kulcha,Breads,65,100,https://images.unsplash.com/photo-1601050690597-df056fb4ce78?w=500&auto=format&fit=crop&q=60,0aaa8167-5261-4670-a5fb-265cbc3b7910,True
Masala Kulcha,Breads,75,100,https://images.unsplash.com/photo-1601050690597-df056fb4ce78?w=500&auto=format&fit=crop&q=60,0aaa8167-5261-4670-a5fb-265cbc3b7910,True
Lacha Parota,Breads,45,100,https://images.unsplash.com/photo-1601050690597-df056fb4ce78?w=500&auto=format&fit=crop&q=60,0aaa8167-5261-4670-a5fb-265cbc3b7910,True
Kadai Chicken Curry,Main Course Curries,255,100,https://images.unsplash.com/photo-1603894584373-5ac82b2ae398?w=500&auto=format&fit=crop&q=60,0aaa8167-5261-4670-a5fb-265cbc3b7910,True
Chicken Tikka Masala,Main Course Curries,275,100,https://images.unsplash.com/photo-1603894584373-5ac82b2ae398?w=500&auto=format&fit=crop&q=60,0aaa8167-5261-4670-a5fb-265cbc3b7910,True
Methi Chicken Curry,Main Course Curries,265,100,https://images.unsplash.com/photo-1603894584373-5ac82b2ae398?w=500&auto=format&fit=crop&q=60,0aaa8167-5261-4670-a5fb-265cbc3b7910,True
Kaju Chicken Curry,Main Course Curries,275,100,https://images.unsplash.com/photo-1603894584373-5ac82b2ae398?w=500&auto=format&fit=crop&q=60,0aaa8167-5261-4670-a5fb-265cbc3b7910,True
Afghani Chicken Curry,Main Course Curries,265,100,https://images.unsplash.com/photo-1603894584373-5ac82b2ae398?w=500&auto=format&fit=crop&q=60,0aaa8167-5261-4670-a5fb-265cbc3b7910,True
Telangana Chicken Curry,Main Course Curries,255,100,https://images.unsplash.com/photo-1603894584373-5ac82b2ae398?w=500&auto=format&fit=crop&q=60,0aaa8167-5261-4670-a5fb-265cbc3b7910,True
Punjabi Chicken Curry,Main Course Curries,295,100,https://images.unsplash.com/photo-1603894584373-5ac82b2ae398?w=500&auto=format&fit=crop&q=60,0aaa8167-5261-4670-a5fb-265cbc3b7910,True
Mughlai Chicken Curry,Main Course Curries,285,100,https://images.unsplash.com/photo-1603894584373-5ac82b2ae398?w=500&auto=format&fit=crop&q=60,0aaa8167-5261-4670-a5fb-265cbc3b7910,True
Chicken Keema Curry,Main Course Curries,295,100,https://images.unsplash.com/photo-1603894584373-5ac82b2ae398?w=500&auto=format&fit=crop&q=60,0aaa8167-5261-4670-a5fb-265cbc3b7910,True
Mutton Curry,Main Course Curries,325,100,https://images.unsplash.com/photo-1603894584373-5ac82b2ae398?w=500&auto=format&fit=crop&q=60,0aaa8167-5261-4670-a5fb-265cbc3b7910,True
Mutton Keema Curry,Main Course Curries,365,100,https://images.unsplash.com/photo-1603894584373-5ac82b2ae398?w=500&auto=format&fit=crop&q=60,0aaa8167-5261-4670-a5fb-265cbc3b7910,True
Veg Manchuria,Vegetarian Menu,175,100,https://images.unsplash.com/photo-1599487488170-d11ec9c172f0?w=500&auto=format&fit=crop&q=60,0aaa8167-5261-4670-a5fb-265cbc3b7910,True
Gobi 65,Vegetarian Menu,215,100,https://images.unsplash.com/photo-1599487488170-d11ec9c172f0?w=500&auto=format&fit=crop&q=60,0aaa8167-5261-4670-a5fb-265cbc3b7910,True
Schezwan Paneer,Vegetarian Menu,265,100,https://images.unsplash.com/photo-1599487488170-d11ec9c172f0?w=500&auto=format&fit=crop&q=60,0aaa8167-5261-4670-a5fb-265cbc3b7910,True
Crispy Corn,Vegetarian Menu,215,100,https://images.unsplash.com/photo-1599487488170-d11ec9c172f0?w=500&auto=format&fit=crop&q=60,0aaa8167-5261-4670-a5fb-265cbc3b7910,True
Crispy Veg,Vegetarian Menu,195,100,https://images.unsplash.com/photo-1599487488170-d11ec9c172f0?w=500&auto=format&fit=crop&q=60,0aaa8167-5261-4670-a5fb-265cbc3b7910,True
Crispy Fried Vegetable,Vegetarian Menu,245,100,https://images.unsplash.com/photo-1599487488170-d11ec9c172f0?w=500&auto=format&fit=crop&q=60,0aaa8167-5261-4670-a5fb-265cbc3b7910,True
Mushroom Manchuria,Vegetarian Menu,245,100,https://images.unsplash.com/photo-1599487488170-d11ec9c172f0?w=500&auto=format&fit=crop&q=60,0aaa8167-5261-4670-a5fb-265cbc3b7910,True
Mushroom 65,Vegetarian Menu,245,100,https://images.unsplash.com/photo-1599487488170-d11ec9c172f0?w=500&auto=format&fit=crop&q=60,0aaa8167-5261-4670-a5fb-265cbc3b7910,True
Chilli Mushroom,Vegetarian Menu,245,100,https://images.unsplash.com/photo-1599487488170-d11ec9c172f0?w=500&auto=format&fit=crop&q=60,0aaa8167-5261-4670-a5fb-265cbc3b7910,True
Paneer 65,Vegetarian Menu,265,100,https://images.unsplash.com/photo-1599487488170-d11ec9c172f0?w=500&auto=format&fit=crop&q=60,0aaa8167-5261-4670-a5fb-265cbc3b7910,True
Paneer Pakoda,Vegetarian Menu,265,100,https://images.unsplash.com/photo-1599487488170-d11ec9c172f0?w=500&auto=format&fit=crop&q=60,0aaa8167-5261-4670-a5fb-265cbc3b7910,True
Chilli Paneer,Vegetarian Menu,265,100,https://images.unsplash.com/photo-1599487488170-d11ec9c172f0?w=500&auto=format&fit=crop&q=60,0aaa8167-5261-4670-a5fb-265cbc3b7910,True
Mangoliam Panner,Vegetarian Menu,265,100,https://images.unsplash.com/photo-1599487488170-d11ec9c172f0?w=500&auto=format&fit=crop&q=60,0aaa8167-5261-4670-a5fb-265cbc3b7910,True
Paneer Majestic,Vegetarian Menu,265,100,https://images.unsplash.com/photo-1599487488170-d11ec9c172f0?w=500&auto=format&fit=crop&q=60,0aaa8167-5261-4670-a5fb-265cbc3b7910,True
Chilli Egg,Non-Vegetarian Menu,225,100,https://images.unsplash.com/photo-1599487488170-d11ec9c172f0?w=500&auto=format&fit=crop&q=60,0aaa8167-5261-4670-a5fb-265cbc3b7910,True
Chilli Chicken,Non-Vegetarian Menu,265,100,https://images.unsplash.com/photo-1599487488170-d11ec9c172f0?w=500&auto=format&fit=crop&q=60,0aaa8167-5261-4670-a5fb-265cbc3b7910,True
Schezwan Chicken,Non-Vegetarian Menu,265,100,https://images.unsplash.com/photo-1599487488170-d11ec9c172f0?w=500&auto=format&fit=crop&q=60,0aaa8167-5261-4670-a5fb-265cbc3b7910,True
Chicken 65,Non-Vegetarian Menu,265,100,https://images.unsplash.com/photo-1599487488170-d11ec9c172f0?w=500&auto=format&fit=crop&q=60,0aaa8167-5261-4670-a5fb-265cbc3b7910,True
Chicken Pakoda,Non-Vegetarian Menu,265,100,https://images.unsplash.com/photo-1599487488170-d11ec9c172f0?w=500&auto=format&fit=crop&q=60,0aaa8167-5261-4670-a5fb-265cbc3b7910,True
Pepper Chicken,Non-Vegetarian Menu,265,100,https://images.unsplash.com/photo-1599487488170-d11ec9c172f0?w=500&auto=format&fit=crop&q=60,0aaa8167-5261-4670-a5fb-265cbc3b7910,True
Dragon Chicken,Non-Vegetarian Menu,265,100,https://images.unsplash.com/photo-1599487488170-d11ec9c172f0?w=500&auto=format&fit=crop&q=60,0aaa8167-5261-4670-a5fb-265cbc3b7910,True
Chicken 555,Non-Vegetarian Menu,265,100,https://images.unsplash.com/photo-1599487488170-d11ec9c172f0?w=500&auto=format&fit=crop&q=60,0aaa8167-5261-4670-a5fb-265cbc3b7910,True
Chicken Manchuria,Non-Vegetarian Menu,265,100,https://images.unsplash.com/photo-1599487488170-d11ec9c172f0?w=500&auto=format&fit=crop&q=60,0aaa8167-5261-4670-a5fb-265cbc3b7910,True
Chicken Majestic,Non-Vegetarian Menu,265,100,https://images.unsplash.com/photo-1599487488170-d11ec9c172f0?w=500&auto=format&fit=crop&q=60,0aaa8167-5261-4670-a5fb-265cbc3b7910,True
Hokong Chicken,Non-Vegetarian Menu,265,100,https://images.unsplash.com/photo-1599487488170-d11ec9c172f0?w=500&auto=format&fit=crop&q=60,0aaa8167-5261-4670-a5fb-265cbc3b7910,True
Ginger Chicken,Non-Vegetarian Menu,265,100,https://images.unsplash.com/photo-1599487488170-d11ec9c172f0?w=500&auto=format&fit=crop&q=60,0aaa8167-5261-4670-a5fb-265cbc3b7910,True
Shanghai Chicken,Non-Vegetarian Menu,265,100,https://images.unsplash.com/photo-1599487488170-d11ec9c172f0?w=500&auto=format&fit=crop&q=60,0aaa8167-5261-4670-a5fb-265cbc3b7910,True
Fish Manchuria,Non-Vegetarian Menu,345,100,https://images.unsplash.com/photo-1599487488170-d11ec9c172f0?w=500&auto=format&fit=crop&q=60,0aaa8167-5261-4670-a5fb-265cbc3b7910,True
Fish 65,Non-Vegetarian Menu,345,100,https://images.unsplash.com/photo-1599487488170-d11ec9c172f0?w=500&auto=format&fit=crop&q=60,0aaa8167-5261-4670-a5fb-265cbc3b7910,True
Chilli Fish,Non-Vegetarian Menu,345,100,https://images.unsplash.com/photo-1599487488170-d11ec9c172f0?w=500&auto=format&fit=crop&q=60,0aaa8167-5261-4670-a5fb-265cbc3b7910,True
Garlic Fish,Non-Vegetarian Menu,345,100,https://images.unsplash.com/photo-1599487488170-d11ec9c172f0?w=500&auto=format&fit=crop&q=60,0aaa8167-5261-4670-a5fb-265cbc3b7910,True
Schezwan Fish,Non-Vegetarian Menu,345,100,https://images.unsplash.com/photo-1599487488170-d11ec9c172f5?w=500&auto=format&fit=crop&q=60,0aaa8167-5261-4670-a5fb-265cbc3b7910,True
Ginger Fish,Non-Vegetarian Menu,345,100,https://images.unsplash.com/photo-1599487488170-d11ec9c172f0?w=500&auto=format&fit=crop&q=60,0aaa8167-5261-4670-a5fb-265cbc3b7910,True
Prawns 65,Non-Vegetarian Menu,345,100,https://images.unsplash.com/photo-1599487488170-d11ec9c172f0?w=500&auto=format&fit=crop&q=60,0aaa8167-5261-4670-a5fb-265cbc3b7910,True
Prawns Manchuria,Non-Vegetarian Menu,345,100,https://images.unsplash.com/photo-1599487488170-d11ec9c172f0?w=500&auto=format&fit=crop&q=60,0aaa8167-5261-4670-a5fb-265cbc3b7910,True
Garlic Prawns,Non-Vegetarian Menu,345,100,https://images.unsplash.com/photo-1599487488170-d11ec9c172f0?w=500&auto=format&fit=crop&q=60,0aaa8167-5261-4670-a5fb-265cbc3b7910,True
Egg Family biryani,Jumbo Portions,495,100,https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?w=500&auto=format&fit=crop&q=60,0aaa8167-5261-4670-a5fb-265cbc3b7910,True
Chicken biryani Family,Jumbo Portions,545,100,https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?w=500&auto=format&fit=crop&q=60,0aaa8167-5261-4670-a5fb-265cbc3b7910,True
Chicken biryani Jumbo,Jumbo Portions,765,100,https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?w=500&auto=format&fit=crop&q=60,0aaa8167-5261-4670-a5fb-265cbc3b7910,True
Chicken Fry Piece Family,Jumbo Portions,605,100,https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?w=500&auto=format&fit=crop&q=60,0aaa8167-5261-4670-a5fb-265cbc3b7910,True
Chicken boneless Family,Jumbo Portions,625,100,https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?w=500&auto=format&fit=crop&q=60,0aaa8167-5261-4670-a5fb-265cbc3b7910,True
Fish biryani Family,Jumbo Portions,685,100,https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?w=500&auto=format&fit=crop&q=60,0aaa8167-5261-4670-a5fb-265cbc3b7910,True
Mutton biryani Family,Jumbo Portions,685,100,https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?w=500&auto=format&fit=crop&q=60,0aaa8167-5261-4670-a5fb-265cbc3b7910,True
Prawns biryani Jumbo,Jumbo Portions,865,100,https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?w=500&auto=format&fit=crop&q=60,0aaa8167-5261-4670-a5fb-265cbc3b7910,True
Lollipop Family,Jumbo Portions,615,100,https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?w=500&auto=format&fit=crop&q=60,0aaa8167-5261-4670-a5fb-265cbc3b7910,True
Veg Biryani Family,Jumbo Portions,495,100,https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?w=500&auto=format&fit=crop&q=60,0aaa8167-5261-4670-a5fb-265cbc3b7910,True
Paneer biryani Family,Jumbo Portions,495,100,https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?w=500&auto=format&fit=crop&q=60,0aaa8167-5261-4670-a5fb-265cbc3b7910,True
Kaju biryani Family,Jumbo Portions,495,100,https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?w=500&auto=format&fit=crop&q=60,0aaa8167-5261-4670-a5fb-265cbc3b7910,True
Kaju Paneer Biryani Family,Jumbo Portions,495,100,https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?w=500&auto=format&fit=crop&q=60,0aaa8167-5261-4670-a5fb-265cbc3b7910,True
Mushroom Biryani Family,Jumbo Portions,495,100,https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?w=500&auto=format&fit=crop&q=60,0aaa8167-5261-4670-a5fb-265cbc3b7910,True
Tandoori Chicken (2 Pieces),Piece-Count Portions,305,100,https://images.unsplash.com/photo-1599487488170-d11ec9c172f0?w=500&auto=format&fit=crop&q=60,0aaa8167-5261-4670-a5fb-265cbc3b7910,True
Tandoori Chicken (4 Pieces),Piece-Count Portions,505,100,https://images.unsplash.com/photo-1599487488170-d11ec9c172f0?w=500&auto=format&fit=crop&q=60,0aaa8167-5261-4670-a5fb-265cbc3b7910,True
Chicken Tikka (8 Pieces),Piece-Count Portions,305,100,https://images.unsplash.com/photo-1599487488170-d11ec9c172f0?w=500&auto=format&fit=crop&q=60,0aaa8167-5261-4670-a5fb-265cbc3b7910,True
Tangdi Kebab Half (2 Pieces),Piece-Count Portions,265,100,https://images.unsplash.com/photo-1599487488170-d11ec9c172f0?w=500&auto=format&fit=crop&q=60,0aaa8167-5261-4670-a5fb-265cbc3b7910,True
Tangdi Kebab Full (4 Pieces),Piece-Count Portions,405,100,https://images.unsplash.com/photo-1599487488170-d11ec9c172f0?w=500&auto=format&fit=crop&q=60,0aaa8167-5261-4670-a5fb-265cbc3b7910,True
Kalmi Kebab (8 Pieces),Piece-Count Portions,305,100,https://images.unsplash.com/photo-1599487488170-d11ec9c172f0?w=500&auto=format&fit=crop&q=60,0aaa8167-5261-4670-a5fb-265cbc3b7910,True
Nawabi Murgh Tikka (8 Pices),Piece-Count Portions,295,100,https://images.unsplash.com/photo-1599487488170-d11ec9c172f0?w=500&auto=format&fit=crop&q=60,0aaa8167-5261-4670-a5fb-265cbc3b7910,True`;

// Map Category Names to static IDs from database.json
const categoryMap: Record<string, string> = {
  'Biryani & Rice Dishes': '8abf8429-bb3d-4f5b-a185-52ee6bcf4778',
  'Fried Rice': '8e6a7839-77ae-4ce2-aa54-0de16564a80a',
  'Starters': 'a0eab548-cc44-45e3-b066-e8e7a8ab68f7',
  'Breads': '5e20982b-07f3-4e2a-9886-abd83d3cef6f',
  'Main Course Curries': '8e733081-b215-4e57-ad94-c8808997f933',
  'Vegetarian Menu': '9973782d-d8ae-4480-913a-0e3588ef61c2',
  'Non-Vegetarian Menu': 'bf3beaed-8777-49d9-940c-00cc77151254',
  'Jumbo Portions': '0289ca67-557e-4c06-8e3e-97d7b024fa17',
  'Piece-Count Portions': '4a939d12-6f7d-4831-b426-57b92a3ab5d4'
};

function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      result.push(current);
      current = '';
    } else {
      current += char;
    }
  }
  result.push(current);
  return result;
}

function determineIsVeg(name: string, category: string): boolean {
  const lowercaseName = name.toLowerCase();
  const lowercaseCategory = category.toLowerCase();

  if (lowercaseCategory.includes('vegetarian menu') || lowercaseCategory.includes('breads')) {
    return true;
  }
  if (
    lowercaseName.startsWith('veg') || 
    lowercaseName.includes('paneer') || 
    lowercaseName.includes('mushroom') || 
    lowercaseName.includes('kaju') || 
    lowercaseName.includes('gobi') || 
    lowercaseName.includes('corn') || 
    lowercaseName.includes('jeera') || 
    lowercaseName.includes('curd') || 
    lowercaseName.includes('tomato') || 
    lowercaseName.includes('steam') || 
    lowercaseName.includes('mutter') ||
    lowercaseName.includes('naan') ||
    lowercaseName.includes('roti') ||
    lowercaseName.includes('parota') ||
    lowercaseName.includes('kulcha')
  ) {
    // Exclude chicken or other meats if any mixed item exists
    if (!lowercaseName.includes('chicken') && !lowercaseName.includes('mutton') && !lowercaseName.includes('fish') && !lowercaseName.includes('egg') && !lowercaseName.includes('prawns')) {
      return true;
    }
  }
  return false;
}

async function main() {
  const lines = csvData.split('\n');
  const headers = lines[0].split(',');
  const products: any[] = [];

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    const parts = parseCSVLine(line);
    if (parts.length < 5) continue;

    const name = parts[0].trim();
    const categoryName = parts[1].trim();
    const price = parseFloat(parts[2]);
    const stock = parseInt(parts[3]) || 100;
    const image = parts[4].trim();
    const restaurantId = parts[5]?.trim() || '0aaa8167-5261-4670-a5fb-265cbc3b7910';
    const isActive = parts[6]?.trim().toLowerCase() === 'true';

    const menuCategoryId = categoryMap[categoryName];
    if (!menuCategoryId) {
      console.warn(`⚠️ Warning: Category mapping not found for category "${categoryName}" on product "${name}"`);
      continue;
    }

    const id = crypto.randomUUID();
    const isVeg = determineIsVeg(name, categoryName);

    products.push({
      id,
      restaurantId,
      menuCategoryId,
      name,
      price,
      description: `${name} - prepared with premium ingredients.`,
      image,
      isVeg,
      isAvailable: isActive,
      createdAt: new Date().toISOString()
    });
  }

  console.log(`Parsed ${products.length} products successfully.`);

  // 1. Sync local database.json file
  const DB_FILE = path.join(process.cwd(), 'database.json');
  if (fs.existsSync(DB_FILE)) {
    try {
      const fileContent = fs.readFileSync(DB_FILE, 'utf-8');
      const db = JSON.parse(fileContent);
      db.restaurantProducts = products;
      fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2), 'utf-8');
      console.log('🟢 [LOCAL STORAGE] Successfully updated database.json with products.');
    } catch (err: any) {
      console.error('❌ [LOCAL ERROR] Error updating database.json:', err.message || err);
    }
  }

  // 2. Insert into PostgreSQL (Supabase) if process.env.DATABASE_URL is defined
  const dbUrl = process.env.DATABASE_URL;
  if (dbUrl) {
    console.log('🟢 [PG STORAGE] DATABASE_URL detected. Starting Supabase PostgreSQL import...');
    const pool = new pg.Pool({
      connectionString: dbUrl,
      ssl: dbUrl.includes('supabase.co') ? { rejectUnauthorized: false } : undefined
    });

    try {
      // Begin PostgreSQL Transaction
      await pool.query('BEGIN');

      // Double-check if Bamboo Restaurant exists in table, if not inject it
      const resCheck = await pool.query('SELECT id FROM restaurants WHERE id = $1', ['0aaa8167-5261-4670-a5fb-265cbc3b7910']);
      if (resCheck.rows.length === 0) {
        console.log('Injecting Missing Bamboo Restaurant header...');
        await pool.query(
          `INSERT INTO restaurants (id, name, category_id, image, rating, delivery_minutes, price_for_two, address, phone, is_active)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
          [
            '0aaa8167-5261-4670-a5fb-265cbc3b7910',
            'Bamboo Restaurant',
            '0aaa8167-5261-4670-a5fb-265cbc3b7910',
            'https://zffehapgkbdowqdeoyzf.supabase.co/storage/v1/object/public/restaurant-assets/bamboo-logo.png',
            4.5,
            35,
            250,
            'Bypass Rd, opposite vrn gardens 9490345346, Mahabubabad, Telangana 506101',
            '94903 45346',
            true
          ]
        );
      }

      // Check for each Menu Category in table, if not inject it
      for (const [catName, catId] of Object.entries(categoryMap)) {
        const catCheck = await pool.query('SELECT id FROM menu_categories WHERE id = $1', [catId]);
        if (catCheck.rows.length === 0) {
          console.log(`Injecting missing Menu Category: ${catName}...`);
          await pool.query(
            `INSERT INTO menu_categories (id, restaurant_id, name) VALUES ($1, $2, $3)`,
            [catId, '0aaa8167-5261-4670-a5fb-265cbc3b7910', catName]
          );
        }
      }

      // Clear existing products of Bamboo Restaurant so we don't duplicate on recheck
      console.log('Clearing existing products for Bamboo Restaurant in postgres...');
      await pool.query('DELETE FROM restaurant_products WHERE restaurant_id = $1', ['0aaa8167-5261-4670-a5fb-265cbc3b7910']);

      // Bulk Insert Products
      console.log('Inserting products...');
      for (const product of products) {
        await pool.query(
          `INSERT INTO restaurant_products (id, restaurant_id, menu_category_id, name, price, description, image, is_veg, is_available)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
          [
            product.id,
            product.restaurantId,
            product.menuCategoryId,
            product.name,
            product.price,
            product.description,
            product.image,
            product.isVeg,
            product.isAvailable
          ]
        );
      }

      await pool.query('COMMIT');
      console.log(`🟢 [PG SUCCESS] Uploaded ${products.length} products to Supabase PostgreSQL successfully!`);
    } catch (pgErr: any) {
      await pool.query('ROLLBACK');
      console.error('❌ [PG ERROR] Transaction failed, rolled back:', pgErr.message || pgErr);
    } finally {
      await pool.end();
    }
  } else {
    console.warn('⚠️ [PG STORAGE] DATABASE_URL is not set. Skipped PostgreSQL direct upload.');
  }
}

main().catch(console.error);
