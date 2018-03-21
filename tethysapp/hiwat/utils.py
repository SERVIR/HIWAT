import datetime
from collections import defaultdict,OrderedDict
import json
import operator
import os, tempfile, shutil,functools
import requests
import csv
import json
import calendar
import time
from netCDF4 import Dataset
from config import HIWAT_FILE
import numpy as np

def get_pt_values(s_var,geom_data):

    #Empty list to store the timeseries values
    ts_plot = []

    json_obj = {}

    #Defining the lat and lon from the coords string
    coords = geom_data.split(',')
    stn_lat = float(coords[1])
    stn_lon = float(coords[0])

    nc_fid = Dataset(HIWAT_FILE, 'r') #Reading the netCDF file
    lats = nc_fid.variables['latitude'][:]  #Defining the latitude array
    lons = nc_fid.variables['longitude'][:] #Defining the longitude array
    field = nc_fid.variables[s_var][:]   #Defning the variable array
    time = nc_fid.variables['time'][:]

    abslat = np.abs(lats - stn_lat) #Finding the absolute latitude
    abslon = np.abs(lons - stn_lon) #Finding the absolute longitude
    
    lat_idx = (abslat.argmin())
    lon_idx = (abslon.argmin())

    for timestep, v in enumerate(time):
        val = field[timestep, lat_idx, lon_idx]
        time_stamp = time[timestep] * 1000
        ts_plot.append([time_stamp,float(val)])
        ts_plot.sort()

    # Returning the list with the timeseries values and the point so that they can be displayed on the graph.
    point = [round(stn_lat,2),round(stn_lon,2)]
    json_obj["plot"] = ts_plot
    json_obj["point"] = point

    return json_obj

# get_pt_values('TMP_2maboveground','91.1,20.7')

